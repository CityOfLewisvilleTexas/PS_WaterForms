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

var calendarMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var fiscalMonths = ["October", "November", "December", "January", "February", "March", "April", "May", "June", "July", "August", "September"];


var app = new Vue({
  el: '#app',
  data: {
    loading: false, // for loading spinners
    record: '',
    data: [],
    organizedData: [[], [], []],
    reportYears: [],
    year: parseInt($.QueryString["Year"]) || (new Date()).getFullYear(),
    months: fiscalMonths,
    currentTab: 'January',
    options: [],
    modeOptions: [
                    {'text': 'Fiscal', 'value': 'fiscal'},
                    {'text': 'Calendar', 'value': 'calendar'}
                 ],
    mode: 'fiscal',
    ytd_totals: [],
    fiscalData: [],
    calendarData: [],
  },
  created: function() {
    this.loading = true;
    this.currentTab = this.months[0];
    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;
      
      self.data = [];
      self.ytd_totals = [];
      self.options = [];
      
      $.post('https://query.cityoflewisville.com/v2/', {
        webservice : 'PublicServices/Water/waterCalc',
        year: self.year
      }, function(data) {
        console.log(data)
        self.fiscalData = data[1];
        self.calendarData = data[0];
        self.data = self.fiscalData;
        self.months = fiscalMonths;
        self.organizeDataByYear();
        console.log(self.fiscalData);
        console.log(self.calendarData);
        self.populateOptions();
      });

      // Get lake level data
      // $.post('https://query.cityoflewisville.com/v2/', {
      //     webservice : 'Public Services/Water/viewLakeLevelByDate',
      //     Day        : self.day,
      //     Month      : self.month,
      //     Year       : self.year,
      // }, function(data) {
      //     self.lakelevel = data[0][0].level;
      //     console.log(self.lakelevel);
      // });
      
    },

    daysInMonth: function(month,year, ytd=false) {
      let self = this;
      let days = 0;

      if (ytd) {
        self.data.forEach((_month, index) => {
          if (index > 0 && _month.rMonth !== month) {
            days += (new Date(year, _month.rMonth, 0)).getDate();
          }
        });
      } else {
        days = (new Date(year, month, 0)).getDate();
      }
      return days;
    },

    changeTab: function(tabName) {
      this.currentTab = tabName;
    },
    
    organizeDataByYear: function() {
      var self = this;
      
      self.data.forEach((month, index) => {
        let monthTotals = {};
        console.log(parseInt(month.raw_vault))
        if (index > 1) {
          monthTotals['raw_water_ytd'] = parseFloat(month.raw_vault) + (parseFloat(self.ytd_totals[index - 1].raw_water_ytd || 0 ))
          monthTotals['loss_plant_ytd'] = self.localizeFloat(self.diff(month.raw_vault, month.finished, true) / 1000000, 2) + (parseFloat(self.ytd_totals[index - 1].loss_plant_ytd || 0 ))
          monthTotals['total_treated_ytd'] = self.localizeFloat(self.total(month.finished, month.dallas) / 1000000, 2) + (parseFloat(self.ytd_totals[index - 1].total_treated_ytd || 0 ))
          monthTotals['total_sales_ytd'] = parseFloat(month.total_sales) + (parseFloat(self.ytd_totals[index - 1].total_sales_ytd || 0 ))
          monthTotals['unaccounted_loss_ytd'] = self.localizeFloat(self.diff(self.total(month.finished, month.dallas), month.total_sales) / 1000000, 2) + (parseFloat(self.ytd_totals[index - 1].unaccounted_loss_ytd || 0 ));
          monthTotals['unaccounted_loss_ytd_percent'] = self.localizeFloat((self.diff(self.totalFloat(month.finished, month.dallas), month.total_sales, true) / self.totalFloat(month.finished, month.dallas) * 100), 1) + (parseFloat(self.ytd_totals[index - 1].unaccounted_loss_ytd_percent || 0 ));
          monthTotals['accounted_loss_ytd'] = self.localizeFloat((self.diff(month.raw_vault, month.finished, true) / 1000000) + 5.1, 2) + (parseFloat(self.ytd_totals[index - 1].accounted_loss_ytd || 0 ));
          monthTotals['accounted_loss_ytd_percent'] = self.localizeFloat(((self.diff(month.raw_vault, month.finished, true) / 1000000) + 5.1) / (self.total(month.finished, month.dallas) / 1000000) * 100, 2) + (parseFloat(self.ytd_totals[index - 1].accounted_loss_ytd_percent || 0 ));
          monthTotals['dallas_ytd'] = parseFloat(month.dallas) + (parseFloat(self.ytd_totals[index - 1].dallas_ytd || 0 ))
          monthTotals['esps_ytd'] = parseFloat(month.esps) + (parseFloat(self.ytd_totals[index - 1].esps_ytd || 0 ))
          monthTotals['ssps_ytd'] = parseFloat(month.ssps) + (parseFloat(self.ytd_totals[index - 1].ssps_ytd || 0 ))
          monthTotals['mwps_ytd'] = parseFloat(month.mwps) + (parseFloat(self.ytd_totals[index - 1].mwps_ytd || 0 ))
          monthTotals['esbs_ytd'] = parseFloat(month.esbs) + (parseFloat(self.ytd_totals[index - 1].esbs_ytd || 0 ))
        } else if (index === 1) {
          monthTotals['raw_water_ytd'] = parseFloat(month.raw_vault);
          monthTotals['loss_plant_ytd'] = self.localizeFloat(self.diff(month.raw_vault, month.finished, true) / 1000000, 2);
          monthTotals['total_treated_ytd'] = self.localizeFloat(self.total(month.finished, month.dallas) / 1000000, 2);
          monthTotals['total_sales_ytd'] = parseFloat(month.total_sales);
          monthTotals['unaccounted_loss_ytd'] = self.localizeFloat(self.diff(self.total(month.finished, month.dallas), month.total_sales) / 1000000, 2);
          monthTotals['unaccounted_loss_ytd_percent'] = self.localizeFloat((self.diff(self.totalFloat(month.finished, month.dallas), month.total_sales, true) / self.totalFloat(month.finished, month.dallas) * 100), 1);
          monthTotals['accounted_loss_ytd'] = self.localizeFloat((self.diff(month.raw_vault, month.finished, true) / 1000000) + 5.1, 2);
          monthTotals['accounted_loss_ytd_percent'] = self.localizeFloat(((self.diff(month.raw_vault, month.finished, true) / 1000000) + 5.1) / (self.total(month.finished, month.dallas) / 1000000) * 100, 2);
          monthTotals['dallas_ytd'] = parseFloat(month.dallas);
          monthTotals['esps_ytd'] = parseFloat(month.esps);
          monthTotals['ssps_ytd'] = parseFloat(month.ssps);
          monthTotals['mwps_ytd'] = parseFloat(month.mwps);
          monthTotals['esbs_ytd'] = parseFloat(month.esbs);
        }
        
        self.ytd_totals.push(monthTotals);       
      });
      self.loading = false;
      // console.log(self.ytd_totals)
    },

    populateOptions: function() {
      let self = this;
      
      let options = self.options;
      let optionsArr = [];
      let firstYear = 2017;
      let now = new Date();
      now = parseInt(now.getFullYear());
      // let diff = firstYear - now;
      // console.log(diff);

      while(firstYear <= now){
        optionsArr.push({
          text: '' + firstYear,
          value: '' + firstYear
        });
        firstYear++;
      }
      console.log(optionsArr)
      

      self.options = optionsArr;
      console.log(self.options)
    },

    total: function(...args) {
      let total = args.reduce( (total, arg) => parseInt(total) + parseInt(arg) );
      return total;
    },
    totalFloat: function (...args) {
      let total = args.reduce( (total, arg) => parseFloat(total) + parseFloat(arg) );
      return total;
    },
    diff: function(first, second, float=false) {
      if (float) {
        return (parseFloat(first) - parseFloat(second));
      } else {
        return (parseInt(first) - parseInt(second));
      }
      
    },
    localizeInt: function(input) {
      var value = parseInt(input);
      
      if (isNaN(value)) {
        return ''
      } else {
        return value.toLocaleString()
      }
    },
    localizeFloat: function(input, decimal) {
      let value = parseFloat(input);
      
      if (isNaN(value)) {
        return ''
      } else {
        // console.log(value)
        return value.toFixed(decimal)
      }
    },
    average: function(key) {
      var self = this;
      var average = 0;
      var count = 0;
      self.data.forEach(function(month) {
        var value = parseFloat(month[key]);
        if (!isNaN(value)) {
            average += value;
            count += 1
        }
      });
      average = (average / count).toLocaleString(); // changed to 3 decimal places
      if(isNaN(average)) {
        return "";
      } else {
        return average;
      }
    },

    downloadCSV: function(csv, filename) {
      var csvFile;
      var downloadLink;

      // CSV file
      csvFile = new Blob([csv], {type: "text/csv"});

      // Download link
      downloadLink = document.createElement("a");

      // File name
      downloadLink.download = filename;

      // Create a link to the file
      downloadLink.href = window.URL.createObjectURL(csvFile);

      // Hide download link
      downloadLink.style.display = "none";

      // Add the link to DOM
      document.body.appendChild(downloadLink);

      // Click download link
      downloadLink.click();
    },

    exportTableToCSV: function(filename) {
      var csv = [];
      var rows = document.querySelectorAll("table tr");
      
      for (var i = 0; i < rows.length; i++) {
          var row = [], cols = rows[i].querySelectorAll("td, th");
          
          for (var j = 0; j < cols.length; j++) 
              row.push(cols[j].innerText.replace(/,/g, ''));
          
          csv.push(row.join(","));        
      }

      // Download CSV file
      this.downloadCSV(csv.join("\n"), filename);
    },
    //////////////////////////////////////////
  },
  watch: {
    year: function() {
      console.log("year selected")
      var self = this;
      if (self.year) {
        self.loading = true;
        self.fetchData();
      }
      
    },
    mode: function() {
      console.log("mode selected")
      var self = this;
      self.loading = true;
      self.data = [];
      self.months = [];
      self.ytd_totals = [];

      if (self.mode && self.mode === 'fiscal') {
        self.months = fiscalMonths;
        self.data = self.fiscalData;
        
        self.currentTab = self.months[0];
        self.organizeDataByYear();
      } else if (self.mode && self.mode === 'calendar') {
        self.months = calendarMonths;
        self.data = self.calendarData;
        
        self.currentTab = self.months[0];
        self.organizeDataByYear();
      }
      self.$forceUpdate();
    },
  },
})
