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
    loading: false,
    monthParam: '',
    yearParam: '',
    month: '',
    today: moment(),
    data: [],
  },
  created: function() {
    this.loading = true;
    //this.record = $.QueryString["Record"];
    this.monthParam = $.QueryString["Month"];
    this.yearParam = $.QueryString["Year"];
    this.loading = true;
    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;
      $.post('https://query.cityoflewisville.com/v2/', {
        webservice : 'Public Services/Water/viewFormSubmissionsByMonth',
        Year : self.yearParam,
        Month : self.monthParam,
        FormNumber : '53'
      }, function(data) {
        console.log(data);
        var date = new Date(data[0][2].day); // timezone is an issue when creating a new date object. the third record should be the correct month.
        self.month = months[date.getMonth()];
        self.data = data[0].slice(1);
        self.previousMonth = data[0][0];
        console.log(data[0]);

        console.log( moment.utc(data[0][1].day))
        self.month = moment.utc(data[0][1].day).get('month') + 1;
        console.log(parseInt(self.month));
        self.year = moment.utc(data[0][1].day).get('year');

        self.data.forEach((day) => {
          day.day = moment.utc(day.day);
           console.log(day.day)
        });

        self.loading = false;
      });
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
