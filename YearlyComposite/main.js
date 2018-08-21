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

var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Main App
var app = new Vue({
  el: '#app',
  data: {
    loading: false,
    record: '',
    data: [],
    yearParam: '',
    currentTab: 'totals',
    psofia: '',
    blacklistKeys: ['_date', 'id', 'psofia_createdby', 'psofia_createddate', 'psofia_editedby', 'psofia_editeddate', 'psofia_recordid'],
    options: [
      { text: 'Jan', value: '01' },
      { text: 'Feb', value: '02' },
      { text: 'Mar', value: '03' },
      { text: 'Apr', value: '04' },
      { text: 'May', value: '05' },
      { text: 'Jun', value: '06' },
      { text: 'Jul', value: '07' },
      { text: 'Aug', value: '08' },
      { text: 'Sep', value: '09' },
      { text: 'Oct', value: '10' },
      { text: 'Nov', value: '11' },
      { text: 'Dec', value: '12' },
    ],
    selected: '',
    url: '#',
    carbonSum: 0,
    polySum: 0,
    polyBarrels: 0,
    carbonBags: 0,
    carbonPallets: 0,
  },
  created: function() {
    this.loading = true;
    this.yearParam = $.QueryString["Year"];
    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;
      // Get yearly totals and averages
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewWaterYearlyCompositeReport',
          Year : self.yearParam
      }, function(data) {
        self.loading = false;
        self.data = data[0];
        self.data.forEach((month, idx) => {
          let keys = Object.keys(month);
          // convert string values to objects.
          keys.forEach((key) => {
            if (!self.blacklistKeys.includes(key)) {
              //console.log(month[key])
              // Caution: this is for foramtting objects from strings coming from a database column.
              // eval() is generally frowned upon, but this is exactly what it is made to solve. Use sparingly.
              month[key] = eval("({" + month[key] + "})");
            }
          });
        });
        console.log(data[0])
        self.$nextTick(() => {
          self.carbonBags = self.calculateCarbonBags();
          self.carbonPallets = self.calculateCarbonPallets();
          self.polyBarrels = self.calculatePolyBarrels();
        });
      });
      // Get Electrical data
      $.post('https://query.cityoflewisville.com/v2/', {
            webservice : 'Public Services/Water/viewYearlyWaterElectrical',
            Year : self.yearParam,
        }, function(data) {
          self.electricalData = data[0].slice(1);
          self.previousYearElectrical = data[0][0];
          console.log(data[0]);
        });
    },
    changeTab: function(tabName) {
      this.currentTab = tabName;
    },
    getDifference: function(value, index) { // Get difference between today and previous days value
      let final;
      let previous = (index > 0) ? parseFloat(this.data[index - 1][value]) : parseFloat(this.previousMonth[value]);
      let current = parseFloat(this.data[index][value])
      final = (isNaN(previous) || isNaN(current)) ?  '' : (current - previous).toFixed(1);
      this.calculatedData[index][value] = final;
      return final;
    },
    decimalPlaces: function(value, index, decimalPlaces) {
      let decimalValue = parseFloat(this.data[index][value]).toFixed(decimalPlaces);
      let final = isNaN(decimalValue) ? '' : decimalValue;
      this.calculatedData[index][value] = final;
      return final;
    },
    formatDate: function(dateString) {
      return (dateString === undefined) ? '' : months[parseInt(dateString.split('-')[1]) - 1];
    },
    setUrl: function() {
      let self = this;
      
      let url ="http://apps.cityoflewisville.com/WaterForms/MonthlyComposite/index.html?Year=" + this.yearParam + "&Month=" + this.selected;
      self.url = url;
    },
    sumColumn: function(key, valueType) {
      let self = this;
      let total = 0;
      self.data.forEach((month) => {
        total += parseFloat(month[key][valueType]) || 0.0;
      });
      if (key === 'carbon') {
        self.carbonSum = total;
      } else if (key === 'polymer') {
        self.polySum = total;
      }
      return isNaN(total) ? 0.0 : total.toFixed(1);
    },
    avgColumn: function(key, valueType) {
      let self = this;
      let total = 0;
      let numMonths = 1;
      let avg = 0;
      self.data.forEach((month) => {
        total += parseFloat(month[key][valueType]) || 0.0;
        numMonths += 1;
      });
      
      avg = total / numMonths;
      
      return isNaN(avg) ? 0.0 : avg.toFixed(1);
    },
    calculatePolyBarrels: function() {
      let self = this;

      let polyBarrels = self.polySum / 467.874;   // Based on a specific gravity of 1.02 and full 55 gallon drums.
      return isNaN(polyBarrels) ? 0 : polyBarrels.toFixed(0);
    },
    calculateCarbonBags: function() {
      let self = this;

      let carbonBags = self.carbonSum / 50;   // Based on 50 lbs. bags
      return isNaN(carbonBags) ? 0 : carbonBags.toFixed(0);
    },
    calculateCarbonPallets: function() {
      let self = this;

      let carbonBags = self.carbonSum / 50;   // Based on 50 lbs. bags
      let carbonPallets = carbonBags / 33;    // Based on an average 33 bags per pallet
      return isNaN(carbonPallets) ? 0 : carbonPallets.toFixed(0);
    },
    FtoC: function(f) {
      return ((parseFloat(f) - 32) * 5 / 9).toFixed(1);
    },
    avgCelsius: function() {
      let self = this;
      let total = 0.0;
      self.data.forEach((month, idx) => {
        total += parseFloat(self.FtoC(month.raw_temp.avg));
      });
      return (total / self.data.length).toFixed(1);
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
