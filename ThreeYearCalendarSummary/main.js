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
    organizedData: [[], [], []],
    reportYears: [null, null, null],
    year: parseInt($.QueryString["Year"]) || (new Date()).getFullYear(),
    currentTab: 'page1',
    options: [{ 
                text: "Select Year",
                value: null
              }]
  },
  created: function() {
    this.loading = true;
    this.record = $.QueryString["Record"];
    
    if ((new Date()).getMonth() > 8) {
      console.log('new fiscal year');
      this.year += 1;
    }
    
    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;
      
      self.findYears();
      self.data = [];
      self.options = [];
      //self.organizedData = [[], [], []];
      
      $.post('https://query.cityoflewisville.com/v2/', {
        webservice : 'PublicServices/Water/viewThreeYearCalendarSummary',
        year: self.year
      }, function(data) {
        self.loading = false;
        self.data = data;
        //self.organizeDataByYear();
        console.log(self.data);
      });
      
      $.post('https://query.cityoflewisville.com/v2/', {
        webservice : 'PublicServices/Water/viewWTPThreeYearFiscalHistoricalYears'
      }, function(data) {
        self.loading = false;
        self.options = data[0];
        self.populateOptions();
        console.log(self.options);
      });
      
    },
    changeTab: function(tabName) {
      this.currentTab = tabName;
    },
    findYears: function() {
      let self = this;
      console.log("finding year: " + self.year)
      if (self.year % 3 === 0) {
        self.reportYears = [
          self.year - 1,
          self.year,
          self.year + 1
        ]
      } else if (self.year % 3 === 1) {
        self.reportYears = [
          self.year - 2,
          self.year - 1,
          self.year
        ]
      } else if (self.year % 3 === 2) {
        self.reportYears = [
          self.year,
          self.year + 1,
          self.year + 2
        ]
      }
    },
    organizeDataByYear: function() {
      var self = this;
      
      self.data.forEach((month) => {
        console.log(month._year)
        console.log(self.reportYears)
        
        if (parseInt(month._year) === self.reportYears[0]) {
          self.organizedData[0].push(month);
        } else if (parseInt(month._year) === self.reportYears[1]) {
          self.organizedData[1].push(month);
        } else if (parseInt(month._year) === self.reportYears[2]) {
          self.organizedData[2].push(month);
        }
      });
    },
    total: function(...args) {
      let total = args.reduce( (total, arg) => parseInt(total) + parseInt(arg) );
      return total;
    },
    totalFloat: function (...args) {
      let total = args.reduce( (total, arg) => parseFloat(total) + parseFloat(arg) );
      return total;
    },
    diff: function(first, second, float=false) {
      if (float) {
        return (parseFloat(first) - parseFloat(second));
      } else {
        return (parseInt(first) - parseInt(second));
      }
      
    },
    populateOptions: function() {
      let self = this;
      
      let options = self.options;
      let optionsArr = [];
      let now = new Date();
      now = parseInt(now.getFullYear());
      
      for ( var i = parseInt(options[0]._year); i <= (now + 3); i += 3) {
        console.log(i)
        let text = '';
        
        if (i % 3 === 0) {
          text = (i - 1) + ' - ' + (i + 1);
        } else if (i % 3 === 1) {
          text = (i - 2) + ' - ' + (i);
        } else if (i % 3 === 2) {
          text = (i) + ' - ' + (i + 2);
        }
        
        optionsArr.push({
          text: text,
          value: i
        });
      }
      //if ()
      console.log(optionsArr)
      self.options = optionsArr;
    },
    localizeInt: function(input) {
      var value = parseFloat(input);
      console.log(value)
      if (isNaN(value)) {
        return ''
      } else {
        return value.toLocaleString()
      }
    },
    localizeFloat: function(input, decimal) {
      let value = parseFloat(input);
      
      if (isNaN(value)) {
        return ''
      } else {
        console.log(value)
        return value.toFixed(decimal)
      }
    },
    average: function(key) {
      var self = this;
      var average = 0;
      var count = 0;
      self.data.forEach(function(month) {
        var value = parseFloat(month[key]);
        if (!isNaN(value)) {
            average += value;
            count += 1
        }
      });
      average = (average / count).toLocaleString();	// changed to 3 decimal places
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
          
          for (var j = 0; j < cols.length; j++) 
              row.push(cols[j].innerText.replace(/,/g, ''));

            // TODO - Add functionality to skip on colspans
            // i.e. get colspan value and add csv values of ''
            // get colspan value on var colspan = cols[j].prop("colSpan");

          
          csv.push(row.join(","));        
      }

      // Download CSV file
      this.downloadCSV(csv.join("\n"), filename);
    },
    //////////////////////////////////////////
  },
  watch: {
    year: function() {
      console.log("selected")
      var self = this;
      if (self.year) {
        self.fetchData();
      }
      
    },
  },
})
