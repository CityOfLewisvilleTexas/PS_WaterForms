"use strict";

var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];


// Vue!
var app = new Vue({
    el: "#bigHolder",

    data: {
      years: [],
      months: [],
      sDayOptions: [],
      eDayOptions: [],
      daysInMonth: 0,
      dayDiff: 0,
      days: [],
      sums: {},
      avgs: {},
      max: {},
      min: {},
      startDate: '',
      endDate: '',
      dayDiff: '',
      raw_vault_bin: '',
      raw_vault_start: '',
      raw_vault_end: '',
      esps_bin: '',
      esps_start: '',
      esps_end: '',
      esbs_bin: '',
      esbs_start: '',
      esbs_end: '',
      mwps_bin: '',
      mwps_start: '',
      mwps_end: '',
      ssps_bin: '',
      ssps_start: '',
      ssps_end: '',
      isLoading: true,
      isLoaded: false,
      collapse: [false, false, false, false],
      error: false,
      today: new Date(),
      sdSelect: new Date().getDate(),
      smSelect: new Date().getMonth() + 1,
      eySelect: new Date().getFullYear() - 2016,
      edSelect: new Date().getDate(),
      emSelect: new Date().getMonth() + 1,
      sySelect: new Date().getFullYear() - 2016,
      startDate: '--',
      endDate: '--',
      icons: [{ c: true, e: false }, { c: true, e: false }, { c: true, e: false }, { c: true, e: false }],
      tops: {}
    },

    methods: {
      // search for new date based on Selects
      search: function() {
        var self = this;
        
        // Set date strings
        this.startDate = monthNames[this.smSelect  - 1] + " " + this.sdSelect + ", " + this.years[this.sySelect].year;
        this.endDate = monthNames[this.emSelect  - 1] + " " + this.edSelect + ", " + this.years[this.eySelect].year;
        //console.log(this.startDate);
        //console.log(this.endDate);
        // loading animation
        this.isLoading = true;
        this.isLoaded = false;
        this.error = false;

        // add correct number of days to table
        this.days = [];
        var numDays = new Date(this.sySelect + 2016, this.smSelect, 0).getDate();
        //console.log(numDays)
        for (var i = 0; i < numDays; i++) {
          var obj = {};
          this.days.push(obj);
          this.days[i].Day = i + 1;
        }

        // hit web service
        $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewFormSubmissionsByMonth',
          Year       : self.sySelect + 2016,
          Month      : self.smSelect,
          FormNumber : '50'

        }, function(data) {
          
          // readability
          var days = data[0].slice(1);

          // check if actual data is returned
          if (days.length < 1) {
            self.error = true;
            self.isLoading = false;
            self.isLoaded = true;
            self.sums = {};
            self.avgs = {};

          } else {



            // hide loader, show table
            self.isLoading = false;
            self.isLoaded = true;
            
            let startDate = new Date((self.sySelect + 2016) + '-' + self.pad(self.smSelect) + '-' + self.pad(self.sdSelect) + 'T05:00:00.000Z');
            let endDate = new Date((self.eySelect + 2016) + '-' + self.pad(self.emSelect) + '-' + self.pad(self.edSelect) + 'T05:00:00.000Z');
            //console.log((self.sySelect + 2016) + '-' + self.pad(self.smSelect) + '-' + self.pad(self.sdSelect) + 'T05:00:00.000Z')
            //console.log((self.eySelect + 2016) + '-' + self.pad(self.emSelect) + '-' + self.pad(self.edSelect) + 'T05:00:00.000Z')
            self.startDate = startDate.toLocaleString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
            self.endDate = endDate.toLocaleString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
            
            // loop through all returned data
            var i = 0;
            for (i in days) {
              
              // replace empty strings with --
              Object.keys(days[i]).forEach(function(key, index) {
                  if (!days[i][key]) days[i][key] = "--";
              });

              // populate each day in tables
              var x = days[i]['Day'] - 1;
              self.days[i] = days[i];
              self.days[i]['Day'] = i + 1;
              
            }
            //console.log(self.days)
            //self.rawVaultCalc();
            self.stationCalc('raw_vault', 'Raw_Vault');
            self.stationCalc('esps', 'ESPS_Lewisville_Meters');
            self.stationCalc('esbs', 'ESBS_Lewisville_Meters');
            self.stationCalc('mwps', 'MWPS_Dallas_Meters');
            self.stationCalc('ssps', 'SSPS_Dallas_Meters');
            
          }
        });
      },
      
      pad: function(num) {
        return (parseInt(num) < 10) ? '0' + num : num;
      },

      calculateTop: function(name) {
        var f = app.days[0][name + '_f'];
        var r = app.days[0][name + '_r'];
          if (this.isNumeric(r) && this.isNumeric(f)) this.tops[name + '_top'] = parseFloat(r) - parseFloat(f);
          else
            this.tops[name + '_top'] = 0;
      },
      getDaysInMonth: function() {
        //console.log(this.sySelect + 2016)
        return new Date((this.sySelect + 2016), this.smSelect, 0).getDate()
      },

      // fill out the years/months arrays
      populateSelects: function() {
        var self = this;
        // fill years array
        for (var i = 2016; i <= this.today.getFullYear(); i++) {
          var y = {
            year: i,
            index: i - 2016,
            selected: (i == this.today.getFullYear()) ? true : false
          }
          this.years.push(y);
        }

        // fill months array
        for (var i = 1; i < 13; i++) {
          var m = {
            name: monthNames[i - 1],
            index: i,
            selected: (i == this.today.getMonth()) ? true : false
          }
          this.months.push(m);
        }
        
        this.populateDaysSelect('start');
        this.populateDaysSelect('end');
      },
      populateDaysSelect: function(timeFrame) {
        // fill days array
        for (var i = 1; i <= this.getDaysInMonth(); i++) {
          
          var d = {
            day: i,
            index: i,
            selected: (i == this.today.getDate()) ? true : false
          }
          timeFrame === 'start' ? this.sDayOptions.push(d) : this.eDayOptions.push(d);
          
        }
      },
      
      // update start and end esps meter reads
      stationCalc: function(station, id) {
        var self = this;
        let start = 1;
        let end = 1;
        let startDate, endDate, meterStart, meterEnd;
        let station_start = station + '_start';
        let station_end = station + '_end';
        let station_bin = station + '_bin';
        
        // loop through properties, find first and last meter reading
        for (var i in self.days) {
          if (self.days[i][id] !== '--') {
            meterStart = parseFloat(self.days[i][id]) * 1000;
            start = i + 1;
            startDate = new Date(self.days[i]['_Date'] + 'T05:00:00Z');
            break;
          } 
        }
        
        for (var i = self.days.length - 1; i >= 0; i--) {
          if (self.days[i][id] !== '--') {
            meterEnd = parseFloat(self.days[i][id]) * 1000;
            end = i + 1;
            endDate = new Date(self.days[i]['_Date'] + 'T05:00:00Z');
            break;
          } 
        }
        
        // interpolate the meter usage per day and extrapolate to required start and end days
        if ((parseInt(end) - parseInt(start)) > 0) {
          let dayDiff = end - start;
          let meterDiff = meterEnd - meterStart;
          let bin = meterDiff / dayDiff;
          self[station_bin] = bin;
          
          for (var i in self.days) {
            self.days[i][id] = (i - start) * bin + meterStart;
            
          }
          
          console.log(parseInt(start))
          self[station_start] = self.days[parseInt(self.sdSelect) - 1][id]
          self[station_end] = self.days[parseInt(self.edSelect) - 1][id]
          
        } else {
          self[station_start] = '--';
          self[station_end] = '--';
        }

      },
      
      diff: function(larger, smaller) {
        return isNaN(parseFloat(larger) - parseFloat(smaller)) ? 0 : parseFloat(larger) - parseFloat(smaller);
      },

      // checks for numeric table data
      isNumeric: function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
      }
    },

    // populate dropdowns on creation
    created: function() {
      this.populateSelects();
    }
});

// initial search
app.search();

// handle scroll-to buttons
$(document).ready(function() {

    // show/hide scroll-to-top button
    $("#fab2").hide();
    $(window).scroll(function() {
        if ($(this).scrollTop()) {
            $('#fab2:hidden').stop(true, true).fadeIn("fast");
        } else {
            $('#fab2').stop(true, true).fadeOut("fast");
        }
    });

    // scroll-to-top of page
    $("#fab2").click(function(event) {
        $('html, body').animate({
            scrollTop: 0
        }, 500);
    });

    // handles scroll to anchor
    $(".link-td").click(function(event) {
        event.preventDefault();
        $('html, body').animate({
            scrollTop: $($.attr(this, 'href')).offset().top
        }, 500);
    });
});