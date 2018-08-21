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
    header: {},
    date: '',
    month: '',
    year: '',
    monthParam: '',
    yearParam: '',
    currentTab: 'Plant Meters'
  },
  created: function() {
    this.record = $.QueryString["record"];
    this.monthParam = $.QueryString["Month"];
    this.yearParam = $.QueryString["Year"];
    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;

      // If a month is passed as a parameter, request that months data.
      // else request the record number's month of data.
      if (self.record !== undefined) {
        // New v2 request format, don't use citydata anymore
        $.post('https://query.cityoflewisville.com/v2/', {
            webservice : 'Public Services/Water/viewMonthlyMeterReadingsWorksheet',
            record : self.record,
        }, function(data) {
            var date = new Date(data[0][2].day); // timezone is an issue when creating a new date object. the third record should be the correct month.
            self.month = months[date.getMonth()];
            self.year = date.getYear() - 100 + 2000;
            self.data = data[0].slice(1);
            self.previousMonth = data[0][0];
        });
      } else {
        // New v2 request format, don't use citydata anymore
        $.post('https://query.cityoflewisville.com/v2/', {
            webservice : 'Public Services/Water/viewFormSubmissionsByMonth',
            Year : self.yearParam,
            Month : self.monthParam,
            FormNumber : '50',
        }, function(data) {
            var date = new Date(data[0][2].day); // timezone is an issue when creating a new date object. the third record should be the correct month.
            self.month = months[date.getMonth()];
            self.year = date.getYear() - 100 + 2000;
            self.data = data[0].slice(1);
            self.previousMonth = data[0][0];
        });
      }
      // Get the header latest header info for the PWMOR, i.e. PWS ID No. and Number of Connections.
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewPwmorHeaderInfo',
          record : self.record,
      }, function(data) {
          self.header = data[0][0];
          console.log(self.header);
      });

    },
    getDifference: function(value, index) {
      var self = this;
      var previous = (index > 0) ? parseFloat(self.data[index - 1][value]) : parseFloat(self.previousMonth[value]);
      let diff = (self.data[index][value] - previous) / 1000;
      diff = (diff < 0) ? 0.000 : diff;
      return isNaN(diff) ? '0.000' : (diff).toFixed(3);
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
      var esps = parseFloat(self.data[index].ESPS_Dallas_Computer) || 0.0;
      var ssps = parseFloat(self.data[index].SSPS_Dallas_Computer) || 0.0;
      var mwps = parseFloat(self.data[index].MWPS_Dallas_Computer) || 0.0;
      return (esps + ssps + mwps).toFixed(3);
    },
    sumRow: function(index) {
      // For PWMOR, only needs values from raw vault and Dallas computer totals
      let dallas = parseFloat(this.dallasTotals(index));
      let raw_vault = parseFloat(this.getDifference("Raw_Vault", index));
      
      let sum = dallas + raw_vault / 1000
      sum = (sum < 0) ? 0.000 : sum;
      
      return isNaN(sum) ? '0.000' : (sum).toFixed(3);
    },
    columnCalc: function(value) {
      var self = this;
      var total = 0.0;
      var avg = 0.0;
      var min = 100.0;
      var max = 0.0;

      self.data.forEach(function(date, index) {
        var tempVal;
        if (value === "Dallas") {
          tempVal = parseFloat(self.dallasTotals(index));
        } else if (value === "Plant") {
          tempVal = parseFloat(self.getDifference("Raw_Vault", index));
        } else if (value === "Total") {
          tempVal = parseFloat(self.sumRow(index));
        }
        if (isNaN(tempVal)) {
          min = 0.0;
        } else {
          total += tempVal;
          if (tempVal < min && tempVal >= 0) { min = tempVal; }
          if (tempVal > max) { max = tempVal; }
        }
      });

      avg = (total / self.data.length);
      return {total: total.toFixed(3), avg: avg.toFixed(3), min: min.toFixed(3), max: max.toFixed(3)};	// Changed to 3 places
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
