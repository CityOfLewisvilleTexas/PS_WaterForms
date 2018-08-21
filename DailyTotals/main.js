// URL Parameter decoder
(function($) {
    $.QueryString = (function(a) {
        if (a == "") return {};
        var b = {};
        for (var i = 0; i < a.length; ++i)
        {
            var p=a[i].split('=', 2);
            if (p.length != 2) continue;
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })(window.location.search.substr(1).split('&'))
})(jQuery);

var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Main App
var app = new Vue({
  el: '#app',
  data: {
    record: '', // TESTING: 'AF8BA2C6C1B94900A357E63913B91034'
    metersData: [],
    bleachData: [],
    roundsData: [],
    previousMonthMetersData: [],
    date: '',
    dateString: '',
    month: '',
    year: '',
    dayParam: '',
    monthParam: '',
    yearParam: '',
    currentTab: 'Pipe Galley',
    loading: false,
  },
  created: function() {
    this.dayParam = $.QueryString["Day"];
    this.monthParam = $.QueryString["Month"];
    this.yearParam = $.QueryString["Year"];
    this.dateString = this.monthParam + "/" + this.dayParam + "/" + this.yearParam;
    this.loading = true;
    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;
      // Get Meters Data
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewFormSubmissionsByMonth',
          Year : self.yearParam,
          Month : self.monthParam,
          FormNumber : '50'
      }, function(data) {
        var date = new Date(data[0][2].day); // timezone is an issue when creating a new date object. the third record should be the correct month.
        self.month = months[date.getMonth()];
        self.metersData = data[0].slice(1);
        self.year = date.getYear() - 100 + 2000;
        self.previousMonthMetersData = data[0][0];
        console.log(data[0]);
      });

      // Get Bleach/LAS Data
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewDailyWaterFormByDate',
          year : self.yearParam,
          month : self.monthParam,
          day : self.dayParam,
          FormNumber : '53'
      }, function(data) {
        self.bleachData = data[0][0];
        console.log(self.bleachData);
      });

      // Get Rounds data for date
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewWaterRoundsSheetByDate',
          year : self.yearParam,
          month : self.monthParam,
          day : self.dayParam
      }, function(data) {
        self.loading = false;
        self.roundsData = data[0].slice(1,13);
        self.nextDayRound = data[0].slice(13);
        console.log(self.roundsData);
      });

    },
    changeTab: function(tabName) {
      this.currentTab = tabName;
    },
    formatDate: function(dateString) {
      var date = new Date(dateString)
      return date.toUTCString().slice(4, 7);
    },
    getTotal: function(value, index) {
      var self = this;
      var previous = ((index > 0) ? self.metersData[index - 1][value] : self.previousMonthMetersData[value]);
      var current = self.metersData[index][value];
      var total;
      if (current !== null) {
        if (value === "Sludge") { // Sludge meter totals have different calculations
          if (current >= previous && previous) {
            total = (current - previous).toFixed(3); // Changed to 3
          } else if (current < previous) {
            total = ((current + 10000) - previous).toFixed(3); // Changed to 3
          }
        } else if (value.search(/_Electrical/) !== -1) { // The Electrical meter totals have different calculations
          if (current >= previous && previous && current !== null) {
            total = (current - previous).toFixed(3); // Changed to 3
          } else if (current < previous) {
            total = ((current + 10000) - previous).toFixed(3); // Changed to 3
          }
        } else {
          if (current >= previous && previous && current !== null) {
            total = ((current - previous) / 1000).toFixed(3); // Changed to 3
          } else if (current < previous) {
            total = ((current + 10000) - previous).toFixed(3); // Changed to 3
          }
        }
      }
      return total;
    },
    getPolyWeight: function(type) {
      var self = this;
      var key = 'poly_weight_' + type;
      
      self.roundsData.forEach((round) => {
        if (round[key] !== '' || round[key] !== null) {
          return parseFloat(round[key]).toFixed(3); // Changed to 3
        }
      });
    },
    columnCalc: function(value, value2) {
      var self = this;
      var total = 0.0;
      var avg = 0.0;
      var min = 100.0;
      var max = 0.0;

      self.metersData.forEach(function(date, index) {
        var tempVal;
        if (value2 == null) {
          tempVal = parseFloat(self.getTotal(value, index));
        } else {
          tempVal = self.combinedTotal(value, value2, index);
        }

        if (isNaN(tempVal)) {
          min = 0.0;
        } else {
          total += tempVal;
          if (tempVal < min) { min = tempVal; }
          if (tempVal > max) { max = tempVal; }
        }
      });
      avg = (total / self.metersData.length);
      return {total: total.toFixed(2), avg: avg.toFixed(3), min: min.toFixed(2), max: max.toFixed(2)}; // Changed avg to 3
    },
    rowTotal: function(row1, row2, row3=0) {
      row1 = parseFloat(row1) || 0;
      row2 = parseFloat(row2) || 0;
      row3 = parseFloat(row3) || 0;
      
      return row1 + row2 + row3;
    },
    carbonCalc: function() {
      var total = 0;
      var roundTotal;
      var dailyTotal;
      var avg;
      var lbs_hr;
      var mg_l = 0.0;
      var raw_water_total = this.columnCalc("North_Raw").total || 0;
     // raw_water_total = 4.683
      this.roundsData.forEach(function(round, index) {
        total += parseFloat(round.carbon_added) || 0;
      });

      roundTotal = ((total * 50) / 24) * 2;
      dailyTotal = roundTotal * 12;
      avg = dailyTotal / 12;
      lbs_hr = dailyTotal / 24;
      mg_l = (parseFloat(raw_water_total) === 0) ? 0.0 : dailyTotal / (parseFloat(raw_water_total) * 8.34);
      return {roundTotal: roundTotal.toFixed(3), dailyTotal: dailyTotal.toFixed(3), avg: avg.toFixed(3), lbs_hr: lbs_hr.toFixed(3), mg_l: mg_l.toFixed(3)}; // Changed to 3
    },
    roundsColumnCalc: function(value) {
      var self = this;
      var total = 0.0;
      var lbs_hr = 0.0;
      var min = 100.0;
      var max = 0.0;
      var avg = 0.0;
      var mg_l = 0.0;
      var raw_water_total = this.columnCalc("North_Raw").total;
      //raw_water_total = 4.683
      self.roundsData.forEach(function(round, index) {
        var tempVal;

        tempVal = parseFloat(self.roundsData[index][value]);
        if (value.search(/ferr/) !== -1) {
          tempVal = tempVal * 120;
        }

        if (isNaN(tempVal)) {
          min = 0.0;
        } else {
          total += tempVal;
          if (tempVal < min) { min = tempVal; }
          if (tempVal > max) { max = tempVal; }
        }
      });
      if (value.search(/ferr/) !== -1) {
        total = total / 3785.3 * 13;
      }
      lbs_hr = (total / 24);
      avg = (total / 12);

      if (value.search(/ferr/) !== -1  || value.search(/lime/) !== -1) {
        mg_l = (parseFloat(raw_water_total) === 0) ? 0.0 : total / (parseFloat(raw_water_total) * 8.34);
      }
      else {
        mg_l = (parseFloat(raw_water_total) === 0) ? 0.0 : avg / (parseFloat(raw_water_total) * 8.34);
      }

      return {total: total.toFixed(3), lbs_hr: lbs_hr.toFixed(3), min: min.toFixed(3), max: max.toFixed(3), avg: avg.toFixed(3), mg_l: mg_l.toFixed(3)}; // Changed to 3
    }
  }
});
