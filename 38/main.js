// Main App
var app = new Vue({
  el: '#app',
  data: {
    record: '',
    calculatedData: [],
    fieldsToUpdate: [],
    fieldsToCreate: [],
    loading: false,
  },
  created: function() {
    this.record = $.QueryString["record"];
    this.loading = true;
    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;

      // New v2 request format
      $.post('https://query.cityoflewisville.com/v2/', {
        webservice : 'Public Services/Water/viewFlowCalculator',
        //record : self.record,
      }, function(data) {
        self.calculatedData = data[0][0];

        console.log(self.calculatedData);
        self.loading = false;
        self.calculate();
      });
    },
    calculate: function(key=null, value=null) {
      var self = this;
      // Update field to save.
      if(key !== null) {
        this.update(self.calculatedData, key, value, 0);
      }
      

      // calculate total flow from north and south
      var flow_north = parseFloat(this.calculatedData.flow_north) || 0;
      var flow_south = parseFloat(this.calculatedData.flow_south) || 0;
      var flow_total = flow_north + flow_south;
      var post_flow = parseFloat(this.calculatedData.flow_post) || 0;
      this.calculatedData["Flow_Total"] = flow_total;

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

      // Calculate Poly from flows
      var poly1_mgl = parseFloat(this.calculatedData.poly1) || 0;
      var poly2_mgl = parseFloat(this.calculatedData.poly2) || 0;
      this.calculatedData["Poly_north"] = (poly1_mgl * 8.34 * flow_north / 8.6 * 100 / 109 / 0.8).toFixed(1); // Based on imperical data, if pumps change rate it needs to be updated here!
      this.calculatedData["Poly_south"] = (poly2_mgl * 8.34 * flow_south / 17.2 * 100 / 109 / 0.8).toFixed(1); // Based on imperical data, if pumps change rate it needs to be updated here!
      this.calculatedData["Poly_total"] = (parseFloat(this.calculatedData["Poly_north"]) + parseFloat(this.calculatedData["Poly_south"])).toFixed(1);
      this.calculatedData["Poly_north_lbs_2hr"] = (poly1_mgl * 8.34 * flow_north / 12).toFixed(1);
      this.calculatedData["Poly_south_lbs_2hr"] = (poly2_mgl * 8.34 * flow_south / 12).toFixed(1);
      this.calculatedData["Poly_total_lbs_2hr"] = (parseFloat(this.calculatedData["Poly_north_lbs_2hr"]) + parseFloat(this.calculatedData["Poly_south_lbs_2hr"])).toFixed(1);


      // Calculate Carbon
      var carbon_mgl = parseFloat(this.calculatedData.carbon) || 0;
      this.calculatedData["Carbon_025"] = (carbon_mgl * 8.34 * flow_total * 15898 / 1440 / 18).toFixed(0); // Based on imperical data
      this.calculatedData["Carbon_050"] = (carbon_mgl * 8.34 * flow_total * 8325 / 1440 / 18).toFixed(0); // Based on imperical data
      this.calculatedData["Carbon_075"] = (carbon_mgl * 8.34 * flow_total * 5804 / 1440 / 18).toFixed(0); // Based on imperical data
      this.calculatedData["Carbon_100"] = (carbon_mgl * 8.34 * flow_total * 4541 / 1440 / 18).toFixed(0); // Based on imperical data
      this.calculatedData["Carbon_lbs_1hr"] = (carbon_mgl * 8.34 * flow_total / 24 ).toFixed(1);
      this.calculatedData["Carbon_bags"] = Math.ceil(this.calculatedData.Carbon_lbs_1hr * 8 / 50); //(this.calculatedData.Carbon_lbs_1hr * 8 / 50).toFixed(1);
    },
    formatData: function(round, key, value) {
      console.log(round.psofia_recordid);
      return [
        {"recordNumber": round.psofia_recordid, "User": localStorage.colEmail, "Form": "38", "Id": key, "Value": value,},
      ]
    },
    update: function(round, key, value, rowIndex) {
      console.log(round);
      var self = this;
      // If record exists, update it.
      if (round.psofia_recordid) {
        // Check if entry has been modified before, if it has update existing entry on fieldsToUpdate
        var index = -1;
        var parseObject = {round: round, key: key, value: value};
        for (var i = 0; i < self.fieldsToUpdate.length; i++) {
          if (self.fieldsToUpdate[i].key === parseObject.key) {
            index = i;
            break;
          }
        }
        if (index !== -1) {
          self.fieldsToUpdate[index] = parseObject;
        } else {
          self.fieldsToUpdate.push(parseObject)
        }
      // If  the record doesnt exist PSOFIA/ADD a new one
      } else {
        // Check if entry has been modified before, if it has update existing entry on fieldsToCreate
//        var parseObject = {"Id": key, "Value": value}
//        var index = -1;
//        var index2 = -1;
//        var WorkShift;
//        
//        var day = new Date().getDate()
//        var month = new Date().getMonth() + 1
//        var year = new Date().getFullYear()
//        
//        var tempRound = [
//                          {"User": localStorage.colEmail, "Form": "38"},
//                          {"Id": "_Date", "Value": year + "-" + month + "-" + day},
//                          {"Id": "_Time", "Value": round.rTime},
//                          //{"Id": "WorkShift", "Value": round.rShift},
//                           parseObject
//                         ];
//        for (var i = 0; i < self.fieldsToCreate.length; i++) {
//          if (self.fieldsToCreate[i].index === rowIndex) {
//            index = i;
//            break;
//          }
//        }
//
//        for (var i = 0; i < self.fieldsToCreate.length; i++) {
//          if (self.fieldsToCreate[i].round.find(function(round) { return round["Id"] === key; })) {
//            index2 = i;
//            break;
//          }
//        }
//        if (index !== -1) {
//          if (index2 !== -1) {
//            self.fieldsToCreate[index].round[index2] = parseObject;
//
//          } else {
//            self.fieldsToCreate[index].round.push(parseObject)
//
//          }
//        } else {
//          self.fieldsToCreate.push({index: rowIndex, round: tempRound});
//        }
      }
      //self.editing = false;
    },
    upload: function(event) {
      if (!confirm("Save Flow Calculator Settings?")) {
        event.preventDefault();
      } else {
        var self = this;
        this.fieldsToUpdate.forEach(function(round) {
          console.log(round)
          console.log(self.formatData(round.round, round.key, round.value));
          $.post('https://query.cityoflewisville.com/v2/', {
            webservice : 'PSOFIA/UpdateAPI',
            auth_token: localStorage.colAuthToken,
            data: JSON.stringify(self.formatData(round.round, round.key, round.value))
          }, function(data) {
            console.log(data);
          });
        });

        this.fieldsToCreate.forEach(function(round) {
          console.log(JSON.stringify(round.round));
//          $.post('https://query.cityoflewisville.com/v2/', {
//            webservice : 'PSOFIA/AddAPI',
//            auth_token: localStorage.colAuthToken,
//            data: JSON.stringify(round.round)
//          }, function(data) {
//            console.log(data);
//          });
        });
        this.fieldsToUpdate = [];
        this.fieldsToCreate = [];
      }
    },
  }
});
