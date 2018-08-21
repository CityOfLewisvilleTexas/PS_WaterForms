
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

// Socket set up 'Public Services/Water/viewWaterRoundsSheetByDate'
// var myData = new LiveData({webservice : 'PublicServices/Water/copperMonitoring', 
//                             year : $.QueryString["Year"],
//                             month : $.QueryString["Month"],
//                             day : $.QueryString["Day"], 
//                             auth_token: localStorage.colAuthToken});

// Main App
var app = new Vue({
  el: '#app',
  data: {
    record: '', // TESTING: 287ab5ab333b47c1a00d675c464e8d42
    rounds: [],
    data: [],
    savedRounds: [],
    connectStatus: false,

    fieldsToUpdate: [],
    fieldsToCreate: [],

    roundsDate: '',
    currentTab: 'chlorine',
    shift: '',
    shifts: [],
    shiftRounds: [],
    dayParam: '',
    monthParam: '',
    yearParam: '',
    dateString: '',
    inputValue: '',
    previousDay: '',
    nextDay: [],
    previousPoly: 0,
    previousPolyTime: 0,
    flowCalc: [],
    editing: false,
    loading: false,
    NSPS_Pumps_6: false,
    NSPS_Pumps_7: false,
    NSPS_Pumps_8: false,
    NSPS_Pumps_9: false,
    HSP_Pumps_1: false,
    HSP_Pumps_2: false,
    HSP_Pumps_3: false,
    HSP_Pumps_4: false,
    HSP_Pumps_5: false,
    calculatedData: [],
    flowCalcData: [],
    originalFlowCalcData: [],
    flowCalcDiff: false,
    searchFlow: '',
    submitCounter: 1,
    lastFlowSp: [],
    lastFlow: '',
  },
  created: function() {
    var self = this;
    this.record = $.QueryString["record"];
    this.dayParam = $.QueryString["Day"];
    this.monthParam = $.QueryString["Month"];
    this.yearParam = $.QueryString["Year"];
    this.dateString = this.monthParam + "/" + this.dayParam + "/" + this.yearParam;
    this.loading = true;
    this.fetchData();
    // Check time and shift editing window if needed.
    setInterval(function() {
      console.log("Updating editing timestamp");
      var dateToCheck = new Date(self.dateString);
      var currentTime = new Date();
      //console.log(dateToCheck);
      //console.log(currentTime);
      console.log("Updating flow calc: ")
      //if (!self.editing) self.updateFlowCalcValues();
      if (currentTime.getDate() > dateToCheck.getDate() && !self.editing && currentTime.getHours() < 1) {
        console.log("new day");
        self.previousPoly = self.rounds[11].poly_drumweight;
        self.previousPolyTime = self.rounds[11].poly_time;

        //console.log(currentTime.getDate())
        //console.log(dateToCheck.getDate())
        if (currentTime.getYear() > dateToCheck.getYear()) {
          self.yearParam = self.pad(parseInt(self.yearParam) + 1);
          self.monthParam = self.pad(parseInt(self.monthParam) + 1);
          self.dayParam = '01';
        } else if (currentTime.getMonth() > dateToCheck.getMonth()) {
          self.monthParam = self.pad(parseInt(self.monthParam) + 1);
          self.dayParam = '01';
        } else {
          self.dayParam = self.pad(parseInt(self.dayParam) + 1)
        }
        //console.log(self.yearParam)
        //console.log(self.monthParam)
        //console.log(self.dayParam)
        self.dateString = self.monthParam + "/" + self.dayParam + "/" + self.yearParam;
        self.loading = true;
        self.fetchData();
      }
      self.rounds.forEach(function(round, index) {
        self.notThisRound(index);
      });
    }, 60000);
  },
  methods: {
    pad: function(int) {
     return int < 10 ? '0' + int : int;
    },
    changeTab: function(tabName) {
      this.currentTab = tabName;
    },
    connected: function() {
      return this.connectStatus ? 'Connected' : 'Disconnected';
    },
    fetchData: function() {
      var self = this;

      if (self.record !== undefined) {
        $.ajax({
          type: "GET",
          url: "http://eservices.cityoflewisville.com/citydata/?datasetid=PSOFIA_ViewWaterRoundsSheet_Daily&record=" + self.record + "&datasetformat=jsonp&callback=?",
          contentType: "application/json; charset=utf-8",
          dataType: 'jsonp',
          success: (e) => {
            self.loading = false;
            self.roundsDate = e.results[0].rDateFormatted;
            self.data = Object.assign([], e.results);
            self.rounds = Object.assign([], e.results);
            self.rounds.forEach(function(el, idx) {
              self.utiPumps(idx);
              self.intakePumps(idx);
            });
            self.shift = e.results[0].rShift;

            self.setShiftData();
            console.log(e);
            e.results.forEach(function(result) {
              if (self.shifts.indexOf(result.rShift) === -1) { self.shifts.push(result.rShift) };
            });
            Object.keys(self.rounds[0]).forEach((key) => {
              if (key.match(/hsp_pumps.*/) || key.match(/nsps_pumps.*/)) {
                self.checkPumps(key);
              }
            });
          },
          error: (e) => {
            alert("Error: " + e.responseJSON[0][0].error + "\nTry Refreshing Page.");
          }
        });
      } else {
        // Get Rounds data for date
        $.post('https://query.cityoflewisville.com/v2/', {
            webservice : 'Public Services/Water/viewWaterRoundsSheetByDate',
            year : self.yearParam,
            month : self.monthParam,
            day : self.dayParam
        }, function(data) {
          self.loading = false;
          let len = data[0].length;
          self.data = data[0].slice(1,len - 1);
          self.previousDay = data[0][0];
          self.nextDay = data[0][len];
          self.previousPoly = data[0][0].Poly_DrumWeight;
          self.previousPolyTime = data[0][0].Poly_Time;
          console.log(self.previousDay);
          self.rounds = [];
          self.data.forEach((el, idx) => {
            self.rounds.push(Object.assign({}, el));
          });

          self.roundsDate = data[0][1].rDateFormatted;
          
          self.rounds.forEach(function(el, idx) {
            self.utiPumps(idx);
            self.intakePumps(idx);
          });
          Object.keys(self.rounds[0]).forEach((key) => {
            if (key.match(/HSP_Pumps.*/) || key.match(/NSPS_Pumps.*/)) {
              self.checkPumps(key);
            }
          });
          
          console.log(self.data);
          console.log(self.rounds);
        }).fail((e) => {
          alert("Error: " + e.responseJSON[0][0].error + "\nTry Refreshing Page.");
        });
      }
      // Get flow calculator data:
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewFlowCalculator',
      }, function(data) {
        self.calculatedData = data[0][0];
        let keys = Object.keys(data[0][0]);
        keys.forEach((key) => {
          if (!key.includes("psofia_") && !key.includes("_date")) {
            self.originalFlowCalcData[key] = data[0][0][key];
            self.flowCalcData[key] = data[0][0][key];
          }
        });

        self.calculate();
        console.log(self.calculatedData)
      });
    },
    calculate: function(key=null, value=null) {
      var self = this;
      if(key !== null) {
        this.updateFlowCalc(self.calculatedData, key, value, 0);

      }

      // calculate total flow from north and south
      var flow_north = parseFloat(this.calculatedData.flow_north) || 0;
      var flow_south = parseFloat(this.calculatedData.flow_south) || 0;
      var flow_total = flow_north + flow_south;
      var post_flow = parseFloat(this.calculatedData.flow_post) || 0;
      this.calculatedData["Flow_Total"] = flow_total;

      // Calculate Poly from flows
      var poly1_mgl = parseFloat(this.calculatedData.poly1) || 0;
      var poly2_mgl = parseFloat(this.calculatedData.poly2) || 0;
      this.calculatedData["Poly_north"] = (poly1_mgl * 8.34 * flow_north / 8.6 * 100 / 109 / 0.8).toFixed(1); // Based on imperical data, if pumps change rate it needs to be updated here!
      this.calculatedData["Poly_south"] = (poly2_mgl * 8.34 * flow_south / 17.2 * 100 / 109 / 0.8).toFixed(1); // Based on imperical data, if pumps change rate it needs to be updated here!
      this.calculatedData["Poly_total"] = (parseFloat(this.calculatedData["Poly_north"]) + parseFloat(this.calculatedData["Poly_south"])).toFixed(1);
      this.calculatedData["Poly_north_lbs_2hr"] = (poly1_mgl * 8.34 * flow_north / 12).toFixed(1);
      this.calculatedData["Poly_south_lbs_2hr"] = (poly2_mgl * 8.34 * flow_south / 12).toFixed(1);
      this.calculatedData["Poly_total_lbs_2hr"] = (parseFloat(this.calculatedData["Poly_north_lbs_2hr"]) + parseFloat(this.calculatedData["Poly_south_lbs_2hr"])).toFixed(1);

//      // calculate total flow from north and south
//      var flow_north = parseFloat(this.calculatedData.flow_north) || 0;
//      var flow_south = parseFloat(this.calculatedData.flow_south) || 0;
//      var flow_total = flow_north + flow_south;
//      var post_flow = parseFloat(this.calculatedData.flow_post) || 0;
//      this.calculatedData["Flow_Total"] = flow_total;

      // Calculate Cl2 from flows
      var cl2_lbs_day = parseFloat(this.calculatedData.cl2) || 0;
      this.calculatedData["Cl2_north"] = Math.floor(cl2_lbs_day * 8.34 * flow_north);
      this.calculatedData["Cl2_south"] = Math.floor(cl2_lbs_day * 8.34 * flow_south);
      this.calculatedData["Cl2_total"] = Math.floor(cl2_lbs_day * 8.34 * flow_total);
      this.calculatedData["Cl2_post"] = Math.floor(cl2_lbs_day * 8.34 * post_flow);

      // Calculate NH3 from flows
      var nh3_lbs_day = parseFloat(this.calculatedData.nh3) || 0;
      this.calculatedData["NH3_north"] = Math.floor(nh3_lbs_day * 8.34 * flow_north);
      this.calculatedData["NH3_south"] = Math.floor(nh3_lbs_day * 8.34 * flow_south);
      this.calculatedData["NH3_total"] = this.calculatedData["NH3_north"] + this.calculatedData["NH3_south"];

      // Calculate Lime from flows
      var lime_north_mgl = parseFloat(this.calculatedData.north_lime) || 0;
      var lime_south_mgl = parseFloat(this.calculatedData.south_lime) || 0;
      this.calculatedData["Lime_north"] = (lime_north_mgl * 8.34 * flow_north / 12 / 3.4 * 1.16).toFixed(2); // Based on imperical data
      this.calculatedData["Lime_south"] = (lime_south_mgl * 8.34 * flow_south / 12 / 3.4 * 1.033).toFixed(2); // Based on imperical data
      this.calculatedData["Lime_north_total"] = (lime_north_mgl * 8.34 * flow_north / 12).toFixed(2);
      this.calculatedData["Lime_south_total"] = (lime_south_mgl * 8.34 * flow_south / 12).toFixed(2);
      this.calculatedData["Lime_north_lbs_1hr"] = (this.calculatedData.Lime_north_total / 2).toFixed(0);
      this.calculatedData["Lime_south_lbs_1hr"] = (this.calculatedData.Lime_south_total / 2).toFixed(0);

      // Calculate Ferric from flows
      var ferric_mgl = parseFloat(this.calculatedData.ferric) || 0;
      var ferric_north = Math.round(ferric_mgl * 8.34 * flow_north / 12.5 * 3785.3 / 1440); // Based on imperical data
      var ferric_south = Math.round(ferric_mgl * 8.34 * flow_south / 12.5 * 3785.3 / 1440); // Based on imperical data
      var ferric_total = Math.round(ferric_mgl * 8.34 * flow_total / 12.5 * 3785.3 / 1440); // Based on imperical data
      this.calculatedData["ferric_north"] = Math.round10(ferric_north, 1);
      this.calculatedData["ferric_south"] = Math.round10(ferric_south, 1);
      this.calculatedData["ferric_total"] = Math.round10(ferric_total, 1);
      this.calculatedData["ferric_ml_2hr_total"] = Math.round(this.calculatedData.ferric_total * 120);

      // Calculate Carbon
      var carbon_mgl = parseFloat(this.calculatedData.carbon) || 0;
      this.calculatedData["Carbon_025"] = (carbon_mgl * 8.34 * flow_total * 15898 / 1440 / 18).toFixed(0); // Based on imperical data
      this.calculatedData["Carbon_050"] = (carbon_mgl * 8.34 * flow_total * 8325 / 1440 / 18).toFixed(0); // Based on imperical data
      this.calculatedData["Carbon_075"] = (carbon_mgl * 8.34 * flow_total * 5804 / 1440 / 18).toFixed(0); // Based on imperical data
      this.calculatedData["Carbon_100"] = (carbon_mgl * 8.34 * flow_total * 4541 / 1440 / 18).toFixed(0); // Based on imperical data
      this.calculatedData["Carbon_lbs_1hr"] = (carbon_mgl * 8.34 * flow_total / 24 ).toFixed(1);
      this.calculatedData["Carbon_bags"] = Math.ceil(this.calculatedData.Carbon_lbs_1hr * 8 / 50);
    },
    apa_ratio(chlor, nh3) {
      let ratio = parseFloat(chlor) / parseFloat(nh3);
      return isNaN(ratio) ? '' : ratio.toFixed(3);
    },
    setShiftData: function() {
      var self = this;
      self.shiftRounds = [];
      self.shiftRounds = self.rounds.filter(function(round) {
        if (round.rShift === self.shift) {
          return round;
        }
      });
      console.log(self.shiftRounds);
    },
    checkPumps: function(pump) {
      var self = this;
      var on = false;
      self.rounds.forEach((round) => {
        if (round[pump] == '1') {
          on = true;
          console.log('pump ' + pump + ' on');
        }
      });
      self[pump] = on;
    },
    update: function(key=null, rowIndex=null) {
      // This is mainly here to have a hook into any changes on the page, right now it prints out updates.

      var self = this;

      if (key === 'nsps_flow') {
        value = self.checkNspsFlow(rowIndex);
      }

      // Look for differences between rounds and original data returned from server request.
      self.rounds.forEach((round, idx) => {
        let keys = Object.keys(round);

        keys.forEach((key) => {
          if(self.data[idx][key] !== round[key]) {

            // if different, check if record # exists.
            if(self.data[idx]['PSOFIA_RecordNumber']) {
              console.log("Update, " + idx + ", " + key + ": " + round[key]);
            } else {
              console.log("Create, " + idx + ", " + key + ": " + round[key]);
            }
            // Update pumps checkbox
            if (key.match(/NSPS_Pumps.*/)) {
              self.checkPumps(key);
            }
            if (key.match(/HSP_Pumps.*/)) {
              self.checkPumps(key);
            }
          }
        });
      });

      //self.editing = false;
    },
    upload: function(event) {
      var self = this;
      var initialed = true;
      self.submitCounter++;

      if (!confirm("Save roundsheet?")) {
        event.preventDefault();
      }

      if(navigator.onLine === true){
        if (initialed) {
          // prevent double submitting.
          if(self.submitCounter === 2) {


            self.loading = true;
            self.editing = false;

            // ********** Each Round ***********
            // Look for differences between rounds and original data returned from server request.
            self.rounds.forEach((round, idx) => {
              let newEntry = false;
              let keys = Object.keys(round);

              // lock in changes in case save doesn't go through.
              self.savedRounds.push(Object.assign({}, round));

              // create new entry json boilerplate to post
              var tempRound = [
                                {"User": localStorage.colEmail, "Form": "36"},
                                {"Id": "_Date", "Value": self.yearParam + "-" + self.monthParam + "-" + self.dayParam},
                                {"Id": "_Time", "Value": round.rTime},
                                {"Id": "WorkShift", "Value": round.rShift},
                               ];

              // look for keys that have been updated
              keys.forEach((key) => {
                // Skip intString and utiString
                if (key !== 'intString' && key !== 'utiString') {
                  if(self.data[idx][key] !== round[key]) {

                    // if different, check if record # exists to update existing record
                    if(self.data[idx]['PSOFIA_RecordNumber']) {
                      console.log("Update, " + idx + ", " + key + ": " + round[key]);
                      console.log(JSON.stringify(self.formatData(round, key, round[key])));
                    $.ajax({
                      type: 'POST',
                      url: 'https://query.cityoflewisville.com/v2/',
                      data: {
                        webservice : 'PSOFIA/UpdateAPI',
                        auth_token: localStorage.colAuthToken,
                        data: JSON.stringify(self.formatData(round, key, round[key])),
                      },
                      tryCount: 0,
                      retryLimit: 3,
                      success: function(data) {
                        console.log(data);
                        self.data = [];
                        self.rounds.forEach((el, idx) => {
                          self.data.push(Object.assign({}, el));
                        });

                        self.savedRounds = [];
                        self.submitCounter = 1;
                        self.loading = false;
                      }
                    }).fail(function(request, status, err) {
                      if (status == 'timeout') {
                        this.tryCount++;
                        if (this.tryCount <= this.retryLimit) {
                          //try again
                          $.ajax(this);
                          alert('Timeout Error, automatically trying to submit again. Do not hit save.');
                          return;
                        }
                        self.loading = false;
                        self.submitCounter = 1;
                        alert('Timed Out, double check connection and try again.');
                        return;
                      }
                      if (xhr.status == 500) {
                        //handle error
                        self.loading = false;
                        self.submitCounter = 1;
                        alert('Server Error, Try saving again.')
                      } else {
                        //handle error
                        self.loading = false;
                        self.submitCounter = 1;
                        alert('Unknown Error: ' + status);
                      }
                    });

                    // else create a new record and set the returned record # incase of future updates without browser refresh.
                    } else {
                      newEntry = true;
                      console.log("Create, " + idx + ", " + key + ": " + round[key]);
                      var parseObject = {"Id": key, "Value": round[key]}
                      var WorkShift;
                      tempRound.push(parseObject);
                    }

                  }
                }
              });

              // Ajax request for creating a round
              if (newEntry) {
                console.log(JSON.stringify(tempRound));
                //var index = parseInt(round.rTime) / 2;
                console.log(idx);

                // function declaration for promise necessary to instantiate the index parameter to use when fired later..
                function setData(data, index) {
                  console.log(data.return[0].RecordNumber);
                  self.rounds[index].PSOFIA_RecordNumber = data.return[0].RecordNumber;
                  console.log(index);

                  self.data = [];
                  self.rounds.forEach((el, idx) => {
                    self.data.push(Object.assign({}, el));
                  });
                  self.savedRounds = [];
                  self.submitCounter = 1;
                  self.loading = false;
                  app.$forceUpdate();

                }

//                $.post('https://query.cityoflewisville.com/v2/', {
//                  webservice : 'PSOFIA/AddAPI',
//                  auth_token: localStorage.colAuthToken,
//                  data: JSON.stringify(tempRound),
//                }, function(data) { setData(data, idx) })
                  
                $.ajax({
                      type: 'POST',
                      url: 'https://query.cityoflewisville.com/v2/',
                      data: {
                        webservice : 'PSOFIA/AddAPI',
                        auth_token: localStorage.colAuthToken,
                        data: JSON.stringify(tempRound),
                      },
                      tryCount: 0,
                      retryLimit: 3,
                      success: function(data) {
                        setData(data, idx)
                      }
                    }).fail(function(request, status, err) {
                      if (status == 'timeout') {
                        this.tryCount++;
                        if (this.tryCount <= this.retryLimit) {
                          //try again
                          $.ajax(this);
                          alert('Timeout Error, automatically trying to submit again. Do not hit save.');
                          return;
                        }
                        self.loading = false;
                        self.submitCounter = 1;
                        alert('Timed Out, double check connection and try again.');
                        return;
                      }
                      if (xhr.status == 500) {
                        //handle error
                        self.loading = false;
                        self.submitCounter = 1;
                        alert('Server Error, Try saving again.')
                      } else {
                        //handle error
                        self.loading = false;
                        self.submitCounter = 1;
                        alert('Unknown Error: ' + status + '\nTry saving again.');
                      }
                    });
              }
            }); // ***********************


            this.uploadFlowCalc();
          }
        }
      } else {
				//notify user that no internet connection is available
				alert("You do not have internet connection. Please go to an area with connection and submit again.");
			}
    },
    parseSlash: function(keyString, index) {
      var self = this;
    	var array = self.rounds[index][keyString].split('/');

      // clear all the previous changes
      if (keyString.slice(0, 3) === 'uti') {
        self.rounds[index].uti1 = null;
        self.rounds[index].uti2 = null;
        self.rounds[index].uti3 = null;
      } else if (keyString.slice(0, 3) === 'int') {
        self.rounds[index].int1 = null;
        self.rounds[index].int2 = null;
        self.rounds[index].int3 = null;
        self.rounds[index].int4 = null;
        self.rounds[index].int5 = null;
        self.rounds[index].int6 = null;
      }

      // Update pumps from input
    	if (array.length > 0 && !!self.rounds[index][keyString]) {
        array.forEach(function(el, idx) {
          let key = keyString.slice(0,3) + el;
          console.log(key)
          self.rounds[index][key] = true;
        });
      }
      self.update();
    },
    formatData: function(round, key, value) {
      console.log(round.PSOFIA_RecordNumber);
      return [
        {"recordNumber": round.PSOFIA_RecordNumber, "User": localStorage.colEmail, "Form": "36", "Id": key, "Value": value,},
      ]
    },
    utiPumps: function(index) {
      var self = this;
      var pumpString = '';
      //check which pumps are running and list them in a string delimited by a /
      if (self.rounds[index].uti1 === "true") {
        pumpString += '1';
      }
      if (self.rounds[index].uti2 === "true") {
        if (pumpString.length > 0) {
          pumpString += '/2';
        } else {
          pumpString += '2';
        }
      }
      if (self.rounds[index].uti3 === "true") {
        if (pumpString.length > 0) {
          pumpString += '/3';
        } else {
          pumpString += '3';
        }
      }
      self.rounds[index].utiString = pumpString;
      self.data[index].utiString = pumpString;
    },
    intakePumps: function(index) {
      var self = this;
      var pumpString = '';
      //check which pumps are running and list them in a string delimited by a /
      if (self.rounds[index].int1 === "true") {
        pumpString += '1';
      }
      if (this.rounds[index].int2 === "true") {
        if (pumpString.length > 0) {
          pumpString += '/2';
        } else {
          pumpString += '2';
        }
      }
      if (self.rounds[index].int3 === "true") {
        if (pumpString.length > 0) {
          pumpString += '/3';
        } else {
          pumpString += '3';
        }
      }
      if (self.rounds[index].int4 === "true") {
        if (pumpString.length > 0) {
          pumpString += '/4';
        } else {
          pumpString += '4';
        }
      }
      if (self.rounds[index].int5 === "true") {
        if (pumpString.length > 0) {
          pumpString += '/5';
        } else {
          pumpString += '5';
        }
      }
      if (self.rounds[index].int6 === "true") {
        if (pumpString.length > 0) {
          pumpString += '/6';
        } else {
          pumpString += '6';
        }
      }
      self.rounds[index].intString = pumpString;
      self.data[index].intString = pumpString;
    },
    calculateCarbonSP: function(index) {
      var self = this;
      var total = 0;
      self.rounds.forEach(function(round) {
        total += parseInt(round.carbon_added) || 0;
      });
      return total * 50 / 24; // 50 lbs bags over a 24 hour day.
    },
    checkNspsFlow: function(index) {
      var self = this;
      let temp = self.rounds[index].nsps_flow

      console.log(index);

      if (parseFloat(temp) >= 500) {
        self.rounds[index].nsps_flow = (parseFloat(temp) * 1440 / 1000000).toFixed(1);
      } else if (!temp) {
        self.rounds[index].nsps_flow = null;
      }
      console.log(self.rounds[index].nsps_flow);
      return self.rounds[index].nsps_flow;
    },
    notThisRound: function(index) {
      var self = this;
      var currentTime = Date.now() / 1000 / 60 / 60;

      var roundTime = new Date(new Date().toDateString() + ' ' + this.rounds[index].rTime).getTime() / 1000 / 60 / 60;
      var range = [roundTime - 1, roundTime + 1];

      return (currentTime >= range[1] || currentTime <= range[0])
    },
    editable: function(index) {
      var self = this;
      if (self.editing) {
        return false;
      } else {
        return (self.notThisRound(index) )
      }

    },
    edit: function() {
      this.editing = !this.editing;
      console.log(this.editing);
    },
    updateFlowCalcValues: function() {
      var self = this;
      self.calculate();
      // Get flow calculator data:
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewFlowCalculator',
      }, function(data) {
          self.calculatedData = data[0][0];
          let keys = Object.keys(data[0][0]);
          keys.forEach((key) => {
            if (!key.includes("psofia_") && !key.includes("_date")) {
              self.originalFlowCalcData[key] = data[0][0][key];
              self.flowCalcData[key] = data[0][0][key];
            }
          });

          self.calculate();
          console.log(self.calculatedData)
      });
    },

    searchFlowCalcByFlow: function(flow) {
      var self = this;
      // Get flow calculator data:
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'PublicServices/Water/viewFlowCalculatorByFlow',
          flow: flow
      }, function(data) {

        console.log(data[0][0])
        if(data[0][0] === undefined) {
          alert("No data for this flow.");
        } else {
          self.calculatedData = data[0][0];
          let keys = Object.keys(data[0][0]);
          keys.forEach((key) => {
            if (!key.includes("psofia_") && !key.includes("_date")) {
              self.flowCalcData[key] = data[0][0][key];
            }
          });

          self.calculate();
          console.log(self.calculatedData)
        }
      });
    },
    toggle: function(key) {
      var self = this;
      self[key] = !self[key];
    },
//    updatePolyChangeTime: function() {
//
//    },
//
    formatDataFlowCalc: function(round, key, value) {
      console.log(round.PSOFIA_RecordNumber);
      return [
        {"recordNumber": round.PSOFIA_RecordNumber, "User": localStorage.colEmail, "Form": "38", "Id": key, "Value": value,},
      ]
    },
    updateFlowCalc: function(round, key, value, rowIndex) {
      console.log(round);
      var self = this;

      let keys = Object.keys(self.originalFlowCalcData);

      keys.forEach((key) => {
        if (self.originalFlowCalcData[key] !== self.flowCalcData[key]) {
          console.log("Flow calculator set points updated.");
          self.flowCalcDiff = true;

        }
      });
    },
    uploadFlowCalc: function(event) {
      var self = this;

      var tempFC =  [
                         {"User": localStorage.colEmail, "Form": "38"},
                         {"Id": "_Date", "Value": self.yearParam + "-" + self.monthParam + "-" + self.dayParam},
                       ];

      let keys = Object.keys(self.originalFlowCalcData);

      // check if changed
      keys.forEach((key) => {
        if (self.originalFlowCalcData[key] !== self.flowCalcData[key]) {
          console.log("Flow calculator set points updated.");
          self.flowCalcDiff = true;

        }
      });

      // Set up json to send
      keys.forEach((key) => {
        var parseObject = {"Id": key, "Value": self.flowCalcData[key]}
        tempFC.push(parseObject);
      });

      // if changed upload flow calc set points to database
      if (self.flowCalcDiff) {
        console.log(JSON.stringify(tempFC));
        $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'PSOFIA/AddAPI',
          auth_token: localStorage.colAuthToken,
          data: JSON.stringify(tempFC)
        }, function(data) {
          console.log(data);
          self.loading = false;
        });
      }

      self.flowCalcDiff = false;
    },
    setTime: function(event, index, key) {
      var self = this;

      var now = new Date();

      var day = ("0" + now.getDate()).slice(-2);
      var month = ("0" + (now.getMonth() + 1)).slice(-2);

      var today = now.getFullYear()+"-"+(month)+"-"+(day) ;

      // Create an array with the current hour, minute and second
        var time = [ now.getHours(), now.getMinutes()];

      // Determine AM or PM suffix based on the hour
        var suffix = ( time[0] < 12 ) ? "AM" : "PM";

      // Convert hour from military time
      //  time[0] = ( time[0] < 12 ) ? time[0] : time[0] - 12;

      // If hour is 0, set it to 12
      //  time[0] = time[0] || 12;

      // If seconds and minutes are less than 10, add a zero
        for ( var i = 0; i < 3; i++ ) {
          if ( time[i] < 10 ) {
            time[i] = "0" + time[i];
          }
        }
      // Return the formatted string
      var _finalTime = time.join(":");

      $(event.currentTarget).val(_finalTime);
      self.rounds[index][key] = _finalTime;
      self.update();
    },
    validate: function(upperLimit, lowerLimit, value) {
      // This is used to show whether an input is within a certain range,
      // it is used to set a class that sets the text color to red.

      let upper = parseFloat(upperLimit);
      let lower = parseFloat(lowerLimit);
      value = parseFloat(value);

      return (upper >= value && lower <= value);
    },
    calcPoly: function(index, round) {
      // Calculate the difference in polymer barrel weight per hour.
      var self = this, diff, timeDiff, start, end, testing, testingStart, testingEnd;

      var dateString = self.rounds[index].rDate || 'no date'
      var today = new Date(dateString.split('-')[0], dateString.split('-')[1] - 1, dateString.split('-')[2]);
      var yesterday = new Date(today.getYear() + 1900, today.getMonth(), today.getDate() - 1);
      console.log(today)
      console.log(yesterday)
      

      // If no previous record, use previous days poly info
      if (self.rounds[index - 1]) {
        // If poly was changed, use changed poly info
        if (self.rounds[index - 1].poly_weight_new && self.rounds[index - 1].new_poly_time) {
          let startTime = self.rounds[index - 1].new_poly_time ? self.rounds[index - 1].new_poly_time.split(':') : 'no time';
          let endTime = self.rounds[index].Poly_Time ? self.rounds[index].Poly_Time.split(':') : 'no time';

          start = new Date(today.getYear() + 1900, today.getMonth(), today.getDate(), parseInt(startTime[0]), parseInt(startTime[1]));
          end = new Date(today.getYear() + 1900, today.getMonth(), today.getDate(), parseInt(endTime[0]), parseInt(endTime[1]));

          timeDiff = Math.abs(start - end);
          timeDiff = (timeDiff/1000)/60/120 || 1; // 2 hours

          diff = ((self.rounds[index - 1].poly_weight_new - round.Poly_DrumWeight) / timeDiff).toFixed(2);
          testing = '1'
        } else {
          // Normal poly calculation here
          let startTime = self.rounds[index - 1].Poly_Time ? self.rounds[index - 1].Poly_Time.split(':') : 'no time';
          let startDate = self.rounds[index - 1].rDate || 'no date';
          let endTime = self.rounds[index].Poly_Time ? self.rounds[index].Poly_Time.split(':') : 'no time';
          console.log(startTime)
          if (parseInt(startTime[0]) > 20 && parseInt(startTime[0]) < 24) {
            start = new Date(yesterday.getYear() + 1900, yesterday.getMonth(), yesterday.getDate(), parseInt(startTime[0]), parseInt(startTime[1]));
          } else {
            start = new Date(startDate.split('-')[0], startDate.split('-')[1] - 1, startDate.split('-')[2], parseInt(startTime[0]), parseInt(startTime[1]));
          }
          
          end = new Date(today.getYear() + 1900, today.getMonth(), today.getDate(), parseInt(endTime[0]), parseInt(endTime[1]));

          timeDiff = Math.abs(start - end);
          timeDiff = (timeDiff/1000)/60/120 || 1; // 2 hours

          diff = ((self.rounds[index - 1].Poly_DrumWeight - round.Poly_DrumWeight) / timeDiff).toFixed(2)

          testing = '2'
        }
      } else {
        // get yesterday's date.
        

        if (self.previousPolyTime !== 0 && self.previousPolyTime !== null) {
          start = new Date(yesterday.getYear() + 1900, yesterday.getMonth(), yesterday.getDate(), parseInt(self.previousPolyTime.split(':')[0]), parseInt(self.previousPolyTime.split(':')[1]));
          testingStart = '1'
        } else {
          start = new Date(yesterday.getYear() + 1900, yesterday.getMonth(), yesterday.getDate(), 22, 0); // else assume 2200 for last time.
          testingStart = '2'
        }

        let endTime = self.rounds[index].Poly_Time ? self.rounds[index].Poly_Time.split(':') : 'no time';
        if (endTime.constructor === Array) {
          if (parseInt(endTime[0]) > 3) {
            end = new Date(today.getYear() + 1900, today.getMonth(), today.getDate() - 1, parseInt(endTime[0]), parseInt(endTime[1])); // use yesterdays date if reading taken before midnight.
            testingEnd = '1'
          } else {
            end = new Date(today.getYear() + 1900, today.getMonth(), today.getDate(), parseInt(endTime[0]), parseInt(endTime[1]));
            testingEnd = '2'
          }
        }

        testing = '3'
        timeDiff = Math.abs(start - end);
        timeDiff =(timeDiff/1000)/60/120 || 1; // 2 hours

        diff = (((parseFloat(self.previousPoly) || 0) - round.Poly_DrumWeight)  / timeDiff).toFixed(2)
      }
      console.log(start)
      console.log(end)
      console.log(timeDiff)
      console.log(diff)
      console.log(testing + ', ' + testingStart + ', ' + testingEnd)
      return diff;
    },
    checkPumpString(string) {
      return /^[0-9\]+$|[0-9]+$/.test(string);
    },
    validateFerric: function(index) {
      let self = this, ferr1, ferr2, ferr3, upper, lower;

      ferr1 = parseInt(self.rounds[index].Ferr_Pump1_ml) || 0;
      ferr2 = parseInt(self.rounds[index].Ferr_Pump2_ml) || 0;
      ferr3 = parseInt(self.rounds[index].Ferr_Pump3_ml) || 0;

      upper = parseFloat(self.calculatedData.ferric_ml_2hr_total) * 1.05;
      lower = parseFloat(self.calculatedData.ferric_ml_2hr_total) * 0.95;
//      console.log(upper);
//      console.log(lower);
//      console.log((ferr1 + ferr2 + ferr3) * 120);
      return (upper >= (ferr1 + ferr2 + ferr3) * 120 && lower <= (ferr1 + ferr2 + ferr3) * 120)
    },
    getLastFlow(lastFlow) {
      var self = this;
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'PublicServices/Water/viewWaterLastFlow',
          flow: lastFlow
        }, function(data) {
          console.log(data[0][0]);
          self.lastFlowSp = data[0];
          self.lastFlowUtiPumps();
          self.lastFlowIntakePumps();
        });
    },
    lastFlowUtiPumps: function() {
      var self = this;
      var pumpString = '';
      //check which pumps are running and list them in a string delimited by a /
      if (self.lastFlowSp[0].uti1 === "true") {
        pumpString += '1';
      }
      if (self.lastFlowSp[0].uti2 === "true") {
        if (pumpString.length > 0) {
          pumpString += '/2';
        } else {
          pumpString += '2';
        }
      }
      if (self.lastFlowSp[0].uti3 === "true") {
        if (pumpString.length > 0) {
          pumpString += '/3';
        } else {
          pumpString += '3';
        }
      }
      self.lastFlowSp[0].utiString = pumpString;
    },
    lastFlowIntakePumps: function() {
      var self = this;
      var pumpString = '';
      //check which pumps are running and list them in a string delimited by a /
      if (self.lastFlowSp[0].int1 === "true") {
        pumpString += '1';
      }
      if (this.lastFlowSp[0].int2 === "true") {
        if (pumpString.length > 0) {
          pumpString += '/2';
        } else {
          pumpString += '2';
        }
      }
      if (self.lastFlowSp[0].int3 === "true") {
        if (pumpString.length > 0) {
          pumpString += '/3';
        } else {
          pumpString += '3';
        }
      }
      if (self.lastFlowSp[0].int4 === "true") {
        if (pumpString.length > 0) {
          pumpString += '/4';
        } else {
          pumpString += '4';
        }
      }
      if (self.lastFlowSp[0].int5 === "true") {
        if (pumpString.length > 0) {
          pumpString += '/5';
        } else {
          pumpString += '5';
        }
      }
      if (self.lastFlowSp[0].int6 === "true") {
        if (pumpString.length > 0) {
          pumpString += '/6';
        } else {
          pumpString += '6';
        }
      }
      self.lastFlowSp[0].intString = pumpString;
    },
    parseOperator: function(string) {
      if (string !== null) {
        return string.split('@')[0];
      } else {
        return '';
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
});
