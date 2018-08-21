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

var app = new Vue({
  el: '#app',
  data: {
    loading: false, // for loading spinners
    record: '',
    data: [],
    previousMonth: [],
    date: '',
    month: '',
    monthParam: '',
    yearParam: '',
    calculatedData: [],
  },
  created: function() {
    this.loading = true;
    this.record = $.QueryString["record"];
    this.monthParam = $.QueryString["Month"];
    this.yearParam = $.QueryString["Year"];
    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;
      if (self.record !== undefined) {
        $.post('https://query.cityoflewisville.com/v2/', {
            webservice : 'Public Services/Water/viewMonthlyMeterReadingsWorksheet',
            record : self.record,
        }, function(data) {
            var date = new Date(data[0][2].day); // timezone is an issue when creating a new date object. the third record should be the correct month.
            self.month = months[date.getMonth()];
            self.data = data[0].slice(1);
            self.previousMonth = data[0][0];
            console.log(data[0]);
            self.data.forEach(function(row, idx) {
              self.calculatedData.push({});
            });
        });
      } else {
        $.post('https://query.cityoflewisville.com/v2/', {
            webservice : 'Public Services/Water/viewFormSubmissionsByMonth',
            Year : self.yearParam,
            Month : self.monthParam,
            FormNumber : '50'
        }, function(data) {
          console.log(data);
          var date = new Date(data[0][2].day); // timezone is an issue when creating a new date object. the third record should be the correct month.
          self.month = months[date.getMonth()];
          self.data = data[0].slice(1);
          self.previousMonth = data[0][0];
          console.log(data[0]);
          self.data.forEach(function(row, idx) {
            self.calculatedData.push({});
          });
        });
      }
    },
    formatDate: function(dateString) {
      var date = new Date(dateString);      
      return date.toUTCString().slice(4,7);
    },
    calculateLewComp: function(index) {
      var self = this;
      var ssps = parseFloat(self.data[index].SSPS_Lewisville_Computer) || 0;
      var esps = parseFloat(self.data[index].ESPS_Lewisville_Computer) || 0;
      var esbs = parseFloat(self.data[index].ESBS_Lewisville_Computer) || 0;
      var mwps = parseFloat(self.data[index].MWPS_Lewisville_Computer) || 0;
      
      self.calculatedData[index]['LewCompTotal'] = (ssps + esps + esbs + mwps).toFixed(3);
      
      return (ssps + esps + esbs + mwps).toFixed(3);
    },
    calculateDallasComp: function(index) {
      var self = this;
      var ssps = parseFloat(self.data[index].SSPS_Dallas_Computer) || 0;
      var esps = parseFloat(self.data[index].ESPS_Dallas_Computer) || 0;
      var mwps = parseFloat(self.data[index].MWPS_Dallas_Computer) || 0;
      
      self.calculatedData[index]['DallasCompTotal'] = (ssps + esps + mwps).toFixed(3);
      
      return (ssps + esps + mwps).toFixed(3);
    },
    calculateLewMeters: function(index) {
      var self = this;
      var ssps = parseFloat(self.calculatedData[index].SSPS_Lewisville_Meters) || 0;
      var esps = parseFloat(self.calculatedData[index].ESPS_Lewisville_Meters) || 0;
      var esbs = parseFloat(self.calculatedData[index].ESBS_Lewisville_Meters) || 0;
      var mwps = parseFloat(self.calculatedData[index].MWPS_Dallas_Meters) || 0;
      
      self.calculatedData[index]['LewMetersTotal'] = (ssps + esps + esbs + mwps).toFixed(3);
      
      return (ssps + esps + esbs + mwps).toFixed(3)
    },
    calculateDallasMeters: function(index) {
      var self = this;
      var ssps = parseFloat(self.calculatedData[index].SSPS_Dallas_Meters) || 0;
      var esps = parseFloat(self.calculatedData[index].ESPS_Dallas_Meters) || 0;
      var mwps = parseFloat(self.calculatedData[index].MWPS_Dallas_Meters) || 0;
      
      self.calculatedData[index]['DallasMetersTotal'] = (ssps + esps + mwps).toFixed(3);
      
      return (ssps + esps + mwps).toFixed(3)
    },
    rowDifference: function(key, index) {
      var self = this;
      var previousValue = (index > 0) ? self.data[index - 1][key] : self.previousMonth[key];
      var currentValue = parseFloat(self.data[index][key]);
      previousValue = parseFloat(previousValue);
      var total;
      
      return self.difference(currentValue, previousValue, index, key);
    },
    columnCalc: function(key) {
      var self = this;
      var total = 0;
      self.calculatedData.forEach(function(row, idx) {
        total += parseFloat(row[key]) || 0;
      });
      return total.toFixed(3); // changed to 3 places
    },
    calculateMeterMonthlyDiff: function(key) {
      var self = this;
      var lastMonth = parseFloat(self.previousMonth[key]) || 0;
      var thisMonth = parseFloat(self.data.slice(-1)[key]) || 0;
      var total;
      if (key === 'SSPS_Dallas_Meters') {
          total = self.difference(thisMonth, lastMonth, (self.data.length - 1), key) * 2;
      } else {
        total = self.difference(thisMonth, lastMonth, (self.data.length - 1), key);
      }
      return total;
    },
    difference: function(currentValue, previousValue, index, key) {
      var self = this;
      var total;
      if (!isNaN(currentValue) && !isNaN(previousValue)) {
        // Account for meter rollover:
        if (currentValue < previousValue) {
          currentValue = currentValue + 1000000;
          total = (currentValue - previousValue) / 1000;
        } else {
          total = (currentValue - previousValue) / 1000;
        }
        
        self.calculatedData[index][key] = isNaN(total) ? '' : total.toFixed(3); // Changed to 3 places
        
        return isNaN(total) ? '' : total.toFixed(3); // Changed to 3 places
      }
    },
    pushOnToCalc: function(key, index) {
      var self = this;
      
      self.calculatedData[index][key] = self.data[index][key];
      return self.calculatedData[index][key];
    },
    calculateMonthlyMeterTotal: function(city) {
      var self = this;
      var total;
      if (city === 'Dallas') {
        var mwps = parseFloat(self.columnCalc('MWPS_Lewisville_Meters')) || 0;
        var ssps = parseFloat(self.calculateMeterMonthlyDiff('SSPS_Dallas_Meters')) || 0;
        var esps = parseFloat(self.calculateMeterMonthlyDiff('ESPS_Dallas_Meters')) || 0;

        total = (mwps + ssps + esps).toFixed(3); // Changed to 3 places
      } else if (city === 'Lewisville') {
        var mwps = parseFloat(self.columnCalc('MWPS_Dallas_Meters')) || 0;
        var ssps = parseFloat(self.calculateMeterMonthlyDiff('SSPS_Lewisville_Meters')) || 0;
        var esps = parseFloat(self.calculateMeterMonthlyDiff('ESPS_Lewisville_Meters')) || 0;
        var esbs = parseFloat(self.calculateMeterMonthlyDiff('ESBS_Lewisville_Meters')) || 0;

        total = (mwps + ssps + esps + esbs).toFixed(3); // Changed to 3 places
      }
      return total;
    },
    calculateDallasCompTotal: function() {
      var self = this;
      var ssps = parseFloat(self.columnCalc('SSPS_Dallas_Computer')) || 0;
      var esps = parseFloat(self.columnCalc('ESPS_Dallas_Computer')) || 0;
      var mwps = parseFloat(self.columnCalc('MWPS_Dallas_Computer')) || 0;
      
      return (ssps + esps + mwps).toFixed(3); // Changed to 3 places
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
