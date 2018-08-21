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


// Main App
var app = new Vue({
  el: '#app',
  data: {
    averages: [],
    record: '', // TESTING: ''
    yearParam: '',
    monthParam: '',
    dayParam: '',
    rounds: [],
    roundsDate: '',
    shift: '',
    shifts: [],
    loading: false,
  },
  created: function() {
    this.record = $.QueryString["record"];
    this.yearParam = $.QueryString["Year"];
    this.monthParam = $.QueryString["Month"];
    this.dayParam = $.QueryString["Day"];
    this.loading = true;
    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;
      
      if (self.record !== undefined) {
        $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewDailyFinishedWaterData',
          record : self.record,
        }, function(data) {
          self.roundsDate = data[0][0].rDateFormatted;
          self.rounds = data[0];
          console.log(self.rounds);
          self.loading = false;
        });
      } else {
        $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewDailyFinishedWaterDataByDate',
          Year : self.yearParam,
          Month : self.monthParam,
          Day : self.dayParam,
        }, function(data) {
          self.roundsDate = data[0][0].rDateFormatted;
          self.rounds = data[0];
          console.log(self.rounds);
          self.loading = false;
        });
      }
    },
    average: function(key) {
      var self = this;
      var average = 0;
      var count = 0;
      self.rounds.forEach(function(round) {
        var value = parseFloat(round[key]);
        if (!isNaN(value)) {
            average += value;
            count += 1
        }
      });
      average = (average / count).toFixed(2)
      if(isNaN(average)) {
        return "";
      } else {
        return average;
      }
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
