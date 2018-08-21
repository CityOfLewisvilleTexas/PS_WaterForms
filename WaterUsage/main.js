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
    data: [],
    previousMonth: [],
    date: '',
    month: '',
    monthParam: '',
    yearParam: '',
    calculatedData: [],
    lakelevel: [],
    previousLevel: [],
    loading: false,
  },
  created: function() {
    this.record = $.QueryString["record"];
    this.monthParam = $.QueryString["Month"];
    this.yearParam = $.QueryString["Year"];
    this.fetchData();
    this.loading = true;
  },
  methods: {
    fetchData: function() {
      var self = this;
      if (self.record !== undefined) {
        // New v2 request format, don't use citydata anymore
        $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'PublicServices/Water/viewMonthlyMeterReadingsWorksheet',
          record : self.record,
        }, function(data) {
          var date = new Date(data[0][2].day); // timezone is an issue when creating a new date object. the third record should be the correct month.
          self.month = months[date.getMonth()];
          self.data = data[0].slice(1);
          self.previousMonth = data[0][0];
          self.data.forEach(function(row, idx) {
            self.calculatedData.push({});
          });
          console.log(data[0]);
          self.loading = false;
        });
        // Get lake level data
        $.post('https://query.cityoflewisville.com/v2/', {
            webservice : 'Public Services/Water/viewLakeLevelByDate',
            Month      : self.monthParam,
            Year       : self.yearParam,
        }, function(data) {
            self.lakelevel = data[0].slice(1);
            self.previousLevel = data[0][0]
            console.log(self.lakelevel);
        });
      } else {
        // New v2 request format, don't use citydata anymore
        $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'PublicServices/Water/MonthlyWaterUsage',
          Year : self.yearParam
        }, function(data) {
          //console.log(data);
          var date = new Date(data[0][2].day); // timezone is an issue when creating a new date object. the third record should be the correct month.
          self.month = months[date.getMonth()];
          self.data = data;
          // self.previousMonth = data[0][0];
          // self.data.forEach(function(row, idx) {
          //   self.calculatedData.push({});
          // });
          console.log(self.data);
          self.loading = false;
        });
        // Get lake level data
        // $.post('https://query.cityoflewisville.com/v2/', {
        //     webservice : 'PublicServices/Water/viewLakeLevelByMonth',
        //     Month      : self.monthParam,
        //     Year       : self.yearParam,
        // }, function(data) {

        //     self.lakelevel = data[0].slice(1);
        //     self.previousLevel = data[0][0]
        //     console.log(self.lakelevel);
        // });
      }
    },
    getDifference: function(value, index) {
      var self = this;
      if (value === 'level') {
        var previous = (index > 0) ? parseFloat(self.lakelevel[index - 1][value]) : parseFloat(self.previousLevel[value]);
      } else {
        var previous = (index > 0) ? parseFloat(self.data[index - 1][value]) : parseFloat(self.previousMonth[value]);
      }
      
      var current = parseFloat(self.data[index][value]);
      var final;
      if (isNaN(previous) || isNaN(current)) {
        final = '';
      } else {
        final = ((current - previous) / 1000).toFixed(3);
      }
      self.calculatedData[index][value] = final;
      return final;
    },
    changeTab: function(tabName) {
      this.currentTab = tabName;
    },
    formatDate: function(dateString) {
      var date = new Date(dateString)
      return date.toUTCString().slice(4, 7);
    },
    dallasTotals: function(index) {
      var self = this;
      var esps = parseFloat(self.data[index].ESPS_Dallas_Computer) || 0;
      var ssps = parseFloat(self.data[index].SSPS_Dallas_Computer) || 0;
      var mwps = parseFloat(self.data[index].MWPS_Dallas_Computer) || 0;
      self.calculatedData[index]["dallasTotal"] = (esps + ssps + mwps).toFixed(3);
      return (esps + ssps + mwps).toFixed(3);
    },
    plantTotals: function(index) {
      var self = this;
      var hsp = parseFloat(self.getDifference("Finished", index)) || 0;
      var nsps = parseFloat(self.getDifference("NS_Vault", index)) || 0;
      self.calculatedData[index]["plantTotal"] = (hsp + nsps).toFixed(3);
      return (hsp + nsps).toFixed(3);
    },
    totalPumpage: function(index) {
      var self = this;
      self.calculatedData[index]["totalPumpage"] = ((parseFloat(self.dallasTotals(index)) || 0) + (parseFloat(self.plantTotals(index)) || 0)).toFixed(3);
      return ((parseFloat(self.dallasTotals(index)) || 0) + (parseFloat(self.plantTotals(index)) || 0)).toFixed(3);
    },
    pushOnToCalculated: function(key, index) {
      var self = this;
      if (key === "level") {
        self.calculatedData[index][key] = self.lakelevel[index][key];
        let level = parseFloat(self.lakelevel[index][key]) || '';
        return level === '' ? '' : level.toFixed(2);
      } else {
        self.calculatedData[index][key] = self.data[index][key];
        return self.data[index][key];
      }
      
    },
    columnCalc: function(value) {
      var self = this;
      var total = 0.0;
      var avg = 0.0;
      var min = 100.0;
      var max = 0.0;
      let count = 0;

      self.calculatedData.forEach(function(date, index) {
        var  tempVal = parseFloat(date[value]);
        if (isNaN(tempVal) && tempVal != null) {
          min = 0.0;
        } else {
          total += tempVal;
          if (tempVal < min) { min = tempVal; }
          if (tempVal > max) { max = tempVal; }
          count++;
        }
      });
      
      avg = (total / count);
      return {total: total.toFixed(2), avg: avg.toFixed(2), min: min.toFixed(2), max: max.toFixed(2)};
    },
    //// TESTING DOWNLOAD TO CSV FOR GLENN /////

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
          
          // NOTE: Changes were needed to capture the input values on the rounds sheet.
          // This is the only form that has input values at the moment - CF 12/21/17
          for (var j = 0; j < cols.length; j++) {
            if (cols[j].firstChild && cols[j].firstChild.value) {
              row.push(cols[j].firstChild.value.replace(/,/g, ''));
            } else {
              row.push(cols[j].innerText.replace(/,/g, ''));
            }
          }
          
          csv.push(row.join(","));        
      }

      // Download CSV file
      this.downloadCSV(csv.join("\n"), filename);
    },

    //////////////////////////////////////////
  }
})
