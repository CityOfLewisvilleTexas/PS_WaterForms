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
    currentTab: 'page1',
    loading: false,
    filters: false,
    ct: false,
    dailyWater: false,
    chlorine: false,
    meters: false,
    clarifiers: false,
    ct: false,
  },
  created: function() {
    this.loading = true;
    this.record = $.QueryString["Record"];
    this.dayParam = $.QueryString["Day"];
    this.monthParam = $.QueryString["Month"];
    this.yearParam = $.QueryString["Year"];
    this.loading = true;
    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;
      // New v2 request format, don't use citydata anymore
      $.post('https://query.cityoflewisville.com/v2/', {
        webservice : 'PublicServices/Water/swmorDaily',
        day: self.dayParam,
        month: self.monthParam,
        year: self.yearParam,
      }, function(data) {
        self.loading = false;
        console.log(data);
        if (data[0].length > 0) {
          Object.keys(data[0][0]).forEach((key) => {
            // Test if filter data is null
            if (/filt|Filt/.test(key)) {
              console.log(key)
              if (data[0][0][key] === null) {
                data[0][0][key] = 'X';
                console.log(data[0][0][key]);
              } else {
                self.filters = true;
              }
            }
            // Test if clarifier data is null
            if (/clar|Clar/.test(key)) {
              console.log(key)
              if (data[0][0][key] !== null) {
                self.clarifiers = true;
              }
            }
            if (/raw_alk|raw_turb/.test(key)) {
              console.log(key)
              if (data[0][0][key] !== null) {
                self.dailyWater = true;
              }
            }
            // Test if dailywater data is null
            if (/raw_vault|combined_total/.test(key)) {
              console.log(key)
              if (data[0][0][key] !== null) {
                self.meters = true;
              }
            }
            // Test if chlorine data is null
            if (/cl2|residual/.test(key)) {
              console.log(key)
              if (data[0][0][key] !== null) {
                self.chlorine = true;
              }
            }
            // Test if ct data is null
            if (/ct|CT|temp|ph/.test(key)) {
              console.log(key)
              if (data[0][0][key] !== null) {
                self.ct = true;
              }
            }
          });
        }
        console.log("meters: " + self.meters);
        console.log("clarifiers: " + self.clarifiers);
        console.log("dailyWater: " + self.dailyWater);
        console.log("filters: " + self.filters);
        console.log("chlorine: " + self.chlorine);

        self.data = data[0];
        console.log(self.data);
      });
    },
    changeTab: function(tabName) {
      this.currentTab = tabName;
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
