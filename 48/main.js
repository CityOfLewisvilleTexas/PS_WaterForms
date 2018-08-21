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
    record: '', // TESTING: 'E43A41DFB1E346B7B90C654DC9F9D679'
    yearParam: '',
    monthParam: '',
    dayParam: '',
    currentTime: moment(),
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
    
    // Update row to highlight and grab new data.
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
          webservice : 'Public Services/Water/viewDailyChlorineResidualReport',
          record : self.record,
        }, function(data) {
          self.roundsDate = data[0][0].rDateFormatted;
          self.rounds = data[0];
          console.log(data);
          self.loading = false;
          // console.log(data[0]);
        });
      } else {
        // New v2 request format, don't use citydata anymore
        $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewDailyChlorineResidualReportByDate',
          Year : self.yearParam,
          Month : self.monthParam,
          Day : self.dayParam,
        }, function(data) {
          self.roundsDate = data[0][0].rDateFormatted;
          self.rounds = data[0];
          console.log(data);
          self.loading = false;
          // console.log(data[0]);
        });
      }
    },
    total: function(key, index) {
      let self = this;
      
      let free = parseFloat(self.rounds[index][key + '_cl2_free']);
      let mono = parseFloat(self.rounds[index][key + '_cl2_mono']);
      let di = parseFloat(self.rounds[index][key + '_cl2_di']);
      
      let total = free + mono + di;
      
      return isNaN(total) ? '' : total.toFixed(1);
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
