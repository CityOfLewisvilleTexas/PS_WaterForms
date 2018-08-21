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
    record: '', // TESTING: 'bf3c868d881f408c80fef04f2414c665'
    yearParam: '',
    monthParam: '',
    dayParam: '',
    currentTime: moment(),
    rounds: [],
    chlorine: [],
    roundsDate: '',
    loading: false,
    shift: '',
    shifts: [],
  },
  created: function() {
    this.record = $.QueryString["record"];
    this.yearParam = $.QueryString["Year"];
    this.monthParam = $.QueryString["Month"];
    this.dayParam = $.QueryString["Day"];
    this.loading = true;
    this.fetchData();
    
    setInterval(function() {
      console.log("Updating timestamp");
      
      var currentTime = moment();

      app.fetchData();
      app.$forceUpdate();
    }, 60000);
  },
  methods: {
    fetchData: function() {
      var self = this;
      
      if (self.record !== undefined) {
        // New v2 request format, don't use citydata anymore
        $.post('https://query.cityoflewisville.com/v2/', {
            webservice : 'Public Services/Water/viewDailyWaterAnalysis',
            record : self.record,
        }, function(data) {
            self.roundsDate = data[0][0].rDateFormatted;
            self.rounds = data[0];
            console.log(self.rounds);
            self.loading = false;
        });
      } else {
        // New v2 request format, don't use citydata anymore
        $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewDailyWaterAnalysisByDate',
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
      average = (average / count).toFixed(3);	// changed to 3 decimal places
      if(isNaN(average)) {
        return "";
      } else {
        return average;
      }
    },
    checkTime: function(index) {
      let self = this;
//      console.log('Current time (min.): ' + (self.currentTime.hour() * 60 + self.currentTime.minute()));
//      console.log('Test time (min.): ' + (index * 120));
      let timeSlot = ((self.currentTime.get('hour') * 60 + self.currentTime.get('minute')) <= ((index * 120) + 60) && (self.currentTime.get('hour') * 60 + self.currentTime.get('minute')) >= ((index * 120) - 59));
//      console.log(timeSlot);
      return timeSlot;
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
          
          for (var j = 0; j < cols.length; j++) 
              row.push(cols[j].innerText.replace(/,/g, ''));
          
          csv.push(row.join(","));        
      }

      // Download CSV file
      this.downloadCSV(csv.join("\n"), filename);
    },

    //////////////////////////////////////////

  }
})
