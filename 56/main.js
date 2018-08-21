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
    date: '',
    currentTime: moment(),
    loading: false,
  },
  created: function() {
    this.loading = true;
    this.record = $.QueryString["record"];
    this.dayParam = $.QueryString["Day"];
    this.monthParam = $.QueryString["Month"];
    this.yearParam = $.QueryString["Year"];
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
      // retrieve filter data
      if (this.record !== undefined) {
        $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewDailyWaterFilterRecordByID',
          record   : self.record,
        }, function(data) {
          self.loading = false;
          self.data = data[0];
          self.date = data[0][0].rDateFormatted;
          console.log(self.data);
          self.loading = false;
        });
      } else {
        $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewDailyWaterFilterRecord',
          day   : self.dayParam,
          month : self.monthParam,
          year  : self.yearParam
        }, function(data) {
          self.loading = false;
          self.data = data[0];
          
          let today = moment();
          
          self.data.forEach((hour, idx) => {
            hour.time = moment(self.monthParam + "-" + self.dayParam + "-" + self.yearParam + " " + hour.rTime, 'MM-DD-YYYY HH:mm');
          });
          
          self.date = data[0][0].rDateFormatted;
          console.log(self.data);
          self.loading = false;
        });
      }
    },
    calculateGallons: function(index) {
      var difference = parseInt(this.data[index].bw_meter_end) - parseInt(this.data[index].bw_meter_start);
      return isNaN(difference) ? '' : difference
    },
    displayFilters: function(hrs, status, index) {
      var returnString = this.data[index][hrs];

      if (this.data[index][status] === "bw") {
        returnString += "/BW";
      } else if (this.data[index][status] === "ftw") {
        returnString += "/FTW";
      } else if (this.data[index][status] === "off") {
        returnString += "/OFF"
      } else if (this.data[index][status] === "on") {
        returnString += "/ON"
      }
      else if (this.data[index][status] === "oos") {
        returnString += "/OOS"
      }
      return returnString;
    },
    checkTime: function(index) {
      let self = this;
//      console.log('Current time (min.): ' + (self.currentTime.hour() * 60 + self.currentTime.minute()));
//      console.log('Test time (min.): ' + (index * 60));
      let timeSlot = ((self.currentTime.get('hour') * 60 + self.currentTime.get('minute')) <= ((index * 60) + 30) && (self.currentTime.get('hour') * 60 + self.currentTime.get('minute')) >= ((index * 60) - 29));
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
