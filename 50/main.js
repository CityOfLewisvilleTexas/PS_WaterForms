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
    totals: {
      "Backwash": 0, 
      "ESBS_Lewisville_Computer": 0, 
      "ESBS_Lewisville_Meters": 0, 
      "ESPS_Dallas_Computer": 0, 
      "ESPS_Dallas_Meters": 0, 
      "ESPS_Lewisville_Computer": 0, 
      "ESPS_Lewisville_Meters": 0, 
      "Finished": 0, 
      "gas": 0, 
      "MWPS_Dallas_Computer": 0, 
      "MWPS_Dallas_Meters": 0, 
      "MWPS_Lewisville_Computer": 0, 
      "MWPS_Lewisville_Meters": 0, 
      "North_Raw": 0, 
      "NS_Vault": 0, 
      "NSPS_Electrical": 0, 
      "Plant_Electrical": 0, 
      "Raw_Vault": 0, 
      "Reclaim": 0, 
      "S_Raw": 0, 
      "Sludge": 0, 
      "South_Raw": 0, 
      "SSPS_Dallas_Computer": 0, 
      "SSPS_Dallas_Meters": 0, 
      "SSPS_Lewisville_Computer": 0, 
      "SSPS_Lewisville_Meters": 0, 
//      "Backwash_diff": 0, 
//      "Finished_diff": 0, 
//      "NSPS_Electrical_diff": 0, 
//      "NS_Vault_diff": 0, 
//      "North_Raw_diff": 0, 
//      "Plant_Electrical_diff": 0, 
//      "Raw_Vault_diff": 0, 
//      "Reclaim_diff": 0, 
//      "S_Raw_diff": 0, 
//      "Sludge_diff": 0, 
//      "South_Raw_diff": 0
    },
    date: '',
    month: '',
    monthParam: '',
    yearParam: '',
    today: moment(),
    currentTab: 'Plant Meters',
    loading: false,
  },
  created: function() {
    this.record = $.QueryString["record"];
    this.monthParam = $.QueryString["Month"];
    this.yearParam = $.QueryString["Year"];
    this.loading = true;
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
          
          self.sumTotals();
          
          self.loading = false;
        });
      } else {
        
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
          
          self.sumTotals();
          
          self.loading = false;
        });
      }
    },
    getDifference: function(value, index) {
      var self = this;
      var previous = (index > 0) ? parseFloat(self.data[index - 1][value]) : parseFloat(self.previousMonth[value]);
      var current = parseFloat(self.data[index][value])
      if (isNaN(previous) || isNaN(current)) {
        return '';
      } else {
        //self.totals[value + "_diff"] += 1; //(current - previous);
		if(value=='Sludge'){
			return (current - previous).toFixed(3);	// added if to change decimal to 3 places
		}
		else{
			return (current - previous).toFixed(1);
		}
      }
      
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
      var esps = parseFloat(self.data[index].ESPS_Dallas_Computer) || 0;
      var ssps = parseFloat(self.data[index].SSPS_Dallas_Computer) || 0;
      var mwps = parseFloat(self.data[index].MWPS_Dallas_Computer) || 0;
      return (esps + ssps + mwps).toFixed(3);
    },
    lewTotals: function(index) {
      var self = this;
      var esps = parseFloat(self.data[index].ESPS_Lewisville_Computer) || 0;
      var ssps = parseFloat(self.data[index].SSPS_Lewisville_Computer) || 0;
      var mwps = parseFloat(self.data[index].MWPS_Lewisville_Computer) || 0;
      var esbs = parseFloat(self.data[index].ESBS_Lewisville_Computer) || 0;
      return (esps + ssps + mwps + esbs).toFixed(3);
    },
    sumTotals: function() {
		app.totals = {	// added by CLARSON
		  "Backwash": 0, 
		  "ESBS_Lewisville_Computer": 0, 
		  "ESBS_Lewisville_Meters": 0, 
		  "ESPS_Dallas_Computer": 0, 
		  "ESPS_Dallas_Meters": 0, 
		  "ESPS_Lewisville_Computer": 0, 
		  "ESPS_Lewisville_Meters": 0, 
		  "Finished": 0, 
		  "gas": 0, 
		  "MWPS_Dallas_Computer": 0, 
		  "MWPS_Dallas_Meters": 0, 
		  "MWPS_Lewisville_Computer": 0, 
		  "MWPS_Lewisville_Meters": 0, 
		  "North_Raw": 0, 
		  "NS_Vault": 0, 
		  "NSPS_Electrical": 0, 
		  "Plant_Electrical": 0, 
		  "Raw_Vault": 0, 
		  "Reclaim": 0, 
		  "S_Raw": 0, 
		  "Sludge": 0, 
		  "South_Raw": 0, 
		  "SSPS_Dallas_Computer": 0, 
		  "SSPS_Dallas_Meters": 0, 
		  "SSPS_Lewisville_Computer": 0, 
			"SSPS_Lewisville_Meters": 0
		}
      let self = this;
      let keys = Object.keys(self.totals);
      
      self.data.forEach((day, idx) => {
        keys.forEach((key) => {
          self.totals[key] += parseFloat(day[key]) || 0;
          self.totals[key + "_diff"] = (parseFloat(self.totals[key + "_diff"]) || 0) + (parseFloat(self.getDifference(key, idx)) || 0);
        });
        self.totals['dallas_totals'] = (parseFloat(self.totals['dallas_totals']) || 0) + (parseFloat(self.dallasTotals(idx)) || 0);
        self.totals['lew_totals'] = (parseFloat(self.totals['lew_totals']) || 0) + (parseFloat(self.lewTotals(idx)) || 0);
      });
      
      keys.forEach((key) => {
        if(key=='Sludge' || key.startsWith('ESPS') || key.startsWith('SSPS') || key.startsWith('MWPS') || key.startsWith('ESBS')){
			self.totals[key] = parseFloat(self.totals[key]).toFixed(3);	// added if to change decimal to 3 places
			self.totals[key + "_diff"] = parseFloat(self.totals[key + "_diff"]).toFixed(3);	// added if to change decimal to 3 places
		}
		else{
			self.totals[key] = parseFloat(self.totals[key]).toFixed(1);
			self.totals[key + "_diff"] = parseFloat(self.totals[key + "_diff"]).toFixed(1);
		}
      });
	  // moved following 2 lines outside of forEach
	   self.totals['dallas_totals'] = parseFloat(self.totals['dallas_totals']).toFixed(3); // changed to 3
        self.totals['lew_totals'] = parseFloat(self.totals['lew_totals']).toFixed(3); // changed to 3
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
