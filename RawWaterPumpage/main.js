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
    year: '',
    monthParam: '',
    yearParam: '',
    currentTab: 'Pipe Galley'
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
      if (self.record !== undefined) {
        // New v2 request format, don't use citydata anymore
        $.post('https://query.cityoflewisville.com/v2/', {
            webservice : 'Public Services/Water/viewMonthlyMeterReadingsWorksheet',
            record : self.record,
        }, function(data) {
            var date = new Date(data[0][2].day); // timezone is an issue when creating a new date object. the third record should be the correct month.
            self.month = months[date.getMonth()];
            self.data = data[0].slice(1);
            self.year = date.getYear() - 100 + 2000;
            self.previousMonth = data[0][0];
        });
      } else {
        // New v2 request format, don't use citydata anymore
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
          self.year = date.getYear() - 100 + 2000;
          self.previousMonth = data[0][0];
          console.log(data[0]);
        });
      }

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
      var previous = ((index > 0) ? self.data[index - 1][value] : self.previousMonth[value]);
      var current = self.data[index][value];
      current = parseFloat(current);
      previous = parseFloat(previous);
      
      var total;
      if (current !== null) {
        if (value === "Sludge") { // Sludge meter totals have different calculations
          if (current >= previous && previous) {
            total = (current - previous).toFixed(3);
          } else if (current < previous) {
            total = ((current + 10000) - previous).toFixed(3);
          }
        } else if (value.search(/_Electrical/) !== -1) { // The Electrical meter totals have different calculations
          if (current >= previous && previous && current !== null) {
            total = (current - previous).toFixed(3);
          } else if (current < previous) {
            total = ((current + 10000) - previous).toFixed(3);
          }
        } else if (value === 'S_Raw' || value === 'North_Raw') {
            if (current >= previous && previous && current !== null) {
              total = ((current - previous) / 100).toFixed(3);
            } else if (current < previous) {
              total = ((current + 10000) - previous).toFixed(3);
            }
        } else {
          if (current >= previous && previous && current !== null) {
            total = ((current - previous) / 1000).toFixed(3);
          } else if (current < previous) {
            total = ((current + 10000) - previous).toFixed(3);
          }
        }
      }
      return total;
    },
    combinedTotal: function(value1, value2, index) {
      var self = this;
      var plantTotal = self.getTotal(value1, index);
      var nsTotal = self.getTotal(value2, index);

      if (nsTotal) {
        return parseFloat(plantTotal) + parseFloat(nsTotal);
      } else {
        return 0;
      }
    },
    columnCalc: function(value, value2) {
      var self = this;
      var total = 0.0;
      var avg = 0.0;
      var min = 100.0;
      var max = 0.0;

      self.data.forEach(function(date, index) {
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
      avg = (total / self.data.length);
      return {total: total.toFixed(3), avg: avg.toFixed(3), min: min.toFixed(3), max: max.toFixed(3)}; // Changed to 3
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
});
