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

var days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

var app = new Vue({
  el: '#app',
  data: {
    loading: false, // for loading spinners
    record: '',
    data: [],
    previousWeek: [],
    yearParam: '',
    monthParam: '',
    dayParam: '',
    calculatedData: [],
    personnel: [],
  },
  created: function() {
    this.loading = true;
    this.yearParam = $.QueryString["Year"];
    this.monthParam = $.QueryString["Month"];
    this.dayParam = $.QueryString["Day"];
    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;
      // New v2 request format, don't use citydata anymore
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewWeeklyWaterReport',
          year       : self.yearParam,
          month      : self.monthParam,
          day        : self.dayParam,

      }, function(data) {
        self.loading = false;
        self.data = data[0].slice(1);
        self.previousWeek = data[0][0];
        console.log(self.data);
        
        for (var i = 0; i < self.data.length; i++) {
          self.calculatedData.push({});
        }
        
        // Calculate out Daily Totals:
        for (var index = 0; index < self.data.length; index++) {
          self.calculateChem('ferric', index)
          self.calculateChem('lime', index)
          self.calculateChem('chlorine', index)
          self.calculateChem('ammonia', index)
          self.calculateChem('carbon', index)
          //self.calculateChem('polymer', index)
          //self.calculateBleach(index)
          //self.calculateLas(index)
          self.combinedTotal("finished", "ns_vault", index, 'thousandths')
          self.combinedTotal("raw_vault", null, index, 'thousandths')
        }
      });
      
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewWaterPersonnel',
      }, function(data) {
        self.personnel = data[0][0];
        console.log(self.personnel)
      });
    },
    formatDate: function(index) {
      var self = this;
      var date = new Date(String(self.data[index].date).slice(0,19) + "-0600");
      var dateArr = date.toLocaleDateString().split("/");
      dateArr.pop();
      return dateArr.join("/");
    },
    columnCalc: function(value, value2=null) {
      var self = this;
      var total = 0.0;
      var avg = 0.0;
      var avgCount = 0;
      var min = 100.0;
      var max = 0.0;
      var tempVal;
      var indexMin;
      var indexMax;

      for (var i = 0; i < self.data.length; i++) {
        if (value2 == null) {
          tempVal = parseFloat(self.calculatedData[i][value]); //parseFloat(self.getTotal(value, i));
        } else {
          tempVal = self.combinedTotal(value, value2, i);
        }
        if (isNaN(tempVal)) {
          min = 0.0;
          indexMin = i;
        }else {
          total += tempVal;
          if (tempVal < min) { 
            min = tempVal; 
            indexMin = i;
          }
          if (tempVal > max) { 
            max = tempVal;
            indexMax = i;
          }
          avgCount++;
        }
      }
      avg = (avgCount === 0) ? 0.00 : (total / avgCount);
      return {total: total.toFixed(2), avg: avg.toFixed(2), min: min.toFixed(2), max: max.toFixed(2), indexMin: indexMin, indexMax: indexMax};
    },
    getDifference: function(value, index) {
      var previous = (index > 0) ? parseFloat(this.data[index - 1][value]) : parseFloat(this.previousWeek[value]);
      var current = parseFloat(this.data[index][value])
      if (isNaN(previous) || isNaN(current)) {
        return '';
      } else {
        return (current - previous).toFixed(1);
      }

    },
    combinedTotal: function(value1, value2, index, decimal) { // Get difference between two days and combine totals for two values if provided
      var final;
      var total1 = this.getDifference(value1, index);
      var total2 = (value2 == null) ? 0 : this.getDifference(value2, index);
      var combinedTotal;
      if (decimal === "thousandths") {
        combinedTotal= (parseFloat(total1) + parseFloat(total2)) / 1000;
      } else if (decimal === "hundredths") {
        combinedTotal= (parseFloat(total1) + parseFloat(total2)) / 100;
      } else {
        combinedTotal = parseFloat(total1) + parseFloat(total2);
      }
      final = isNaN(combinedTotal) ? '' : combinedTotal;
      this.calculatedData[index][value1] = final;
      return final;
    },
    pushOnToCalculated: function(valueName, index) {
      var value = this.data[index][valueName];
      this.calculatedData[index][valueName] = value;
      return value;
    },
    calculateChem: function(value, index) {  // there are several chemical lbs usage calculations based on rounds data.
      var self = this;
      var total;
      if (value === 'ferric') {
        var ferr1 = isNaN(parseFloat(self.data[index].Ferr1)) ? 0 : parseFloat(self.data[index].Ferr1);
        var ferr2 = isNaN(parseFloat(self.data[index].Ferr2)) ? 0 : parseFloat(self.data[index].Ferr2);
        var ferr3 = isNaN(parseFloat(self.data[index].Ferr3)) ? 0 : parseFloat(self.data[index].Ferr3);
        total =  ferr1 + ferr2 + ferr3;
        total = (total*120) / 3785.3 * 13;
      } else if (value === 'lime') {
        var lime_n = isNaN(parseFloat(self.data[index].Lime_1N)) ? 0 : parseFloat(self.data[index].Lime_1N);
        var lime_s = isNaN(parseFloat(self.data[index].Lime_2S)) ? 0 : parseFloat(self.data[index].Lime_2S);
        total = lime_n + lime_s;
      } else if (value === 'chlorine') {
        var chlor1 = isNaN(parseFloat(self.data[index].Chlor1)) ? 0 : parseFloat(self.data[index].Chlor1);
        var chlor2 = isNaN(parseFloat(self.data[index].Chlor2)) ? 0 : parseFloat(self.data[index].Chlor2);
        var chlor3 = isNaN(parseFloat(self.data[index].Chlor3)) ? 0 : parseFloat(self.data[index].Chlor3);
        total = (chlor1 + chlor2 + chlor3) / 12;
      } else if (value === 'ammonia') {
        var amm1 = isNaN(parseFloat(self.data[index].Amm1)) ? 0 : parseFloat(self.data[index].Amm1);
        var amm2 = isNaN(parseFloat(self.data[index].Amm2)) ? 0 : parseFloat(self.data[index].Amm2);
        var amm3 = isNaN(parseFloat(self.data[index].Amm3)) ? 0 : parseFloat(self.data[index].Amm3);
        total = (amm1 + amm2 + amm3) / 12;
      } else if (value === 'carbon') {
        var carbon = isNaN(parseFloat(self.data[index].Carbon)) ? 0 : parseFloat(self.data[index].Carbon);
        total = carbon * 50 / 24;
      } else if (value === 'polymer') {
        var polymer = self.calculatePoly(index);
        total = polymer;
      }
      total = Math.round(total);
      this.calculatedData[index][value] = total;
      return total;
    },
    calculateBleach: function(index) {
      var espsBleachNextDay  = (index === this.data.length - 1) ? this.nextMonth.esps_bleach  : this.data[index + 1].esps_bleach;
      var sspsBleachNextDay  = (index === this.data.length - 1) ? this.nextMonth.ssps_bleach  : this.data[index + 1].ssps_bleach;
      var mwpsBleachNextDay  = (index === this.data.length - 1) ? this.nextMonth.mwps_bleach  : this.data[index + 1].mwps_bleach;
      var ovhd1BleachNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd1_bleach : this.data[index + 1].ovhd1_bleach;
      var ovhd2BleachNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd2_bleach : this.data[index + 1].ovhd2_bleach;
      var ovhd3BleachNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd3_bleach : this.data[index + 1].ovhd3_bleach;
      var ovhd4BleachNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd4_bleach : this.data[index + 1].ovhd4_bleach;
      var ovhd5BleachNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd5_bleach : this.data[index + 1].ovhd5_bleach;

      var bleachTotal = ((parseFloat(this.data[index].esps_bleach) || 0) - (parseFloat(this.data[index].esps_bleach_empty) || 0) + (parseFloat(this.data[index].esps_bleach_new) || 0) - (parseFloat(espsBleachNextDay) || 0))
                        + ((parseFloat(this.data[index].mwps_bleach) || 0) - (parseFloat(this.data[index].mwps_bleach_empty) || 0) + (parseFloat(this.data[index].mwps_bleach_new) || 0) - (parseFloat(mwpsBleachNextDay) || 0))
                        + ((parseFloat(this.data[index].ssps_bleach) || 0) - (parseFloat(this.data[index].ssps_bleach_empty) || 0) + (parseFloat(this.data[index].ssps_bleach_new) || 0) - (parseFloat(sspsBleachNextDay) || 0))
                        + ((parseFloat(this.data[index].ovhd1_bleach) || 0) - (parseFloat(this.data[index].ovhd1_bleach_empty) || 0) + (parseFloat(this.data[index].ovhd1_bleach_new) || 0) - (parseFloat(ovhd1BleachNextDay) || 0))
                        + ((parseFloat(this.data[index].ovhd2_bleach) || 0) - (parseFloat(this.data[index].ovhd2_bleach_empty) || 0) + (parseFloat(this.data[index].ovhd2_bleach_new) || 0) - (parseFloat(ovhd2BleachNextDay) || 0))
                        + ((parseFloat(this.data[index].ovhd3_bleach) || 0) - (parseFloat(this.data[index].ovhd3_bleach_empty) || 0) + (parseFloat(this.data[index].ovhd3_bleach_new) || 0) - (parseFloat(ovhd3BleachNextDay) || 0))
                        + ((parseFloat(this.data[index].ovhd4_bleach) || 0) - (parseFloat(this.data[index].ovhd4_bleach_empty) || 0) + (parseFloat(this.data[index].ovhd4_bleach_new) || 0) - (parseFloat(ovhd4BleachNextDay) || 0))
                        + ((parseFloat(this.data[index].ovhd5_bleach) || 0) - (parseFloat(this.data[index].ovhd5_bleach_empty) || 0) + (parseFloat(this.data[index].ovhd5_bleach_new) || 0) - (parseFloat(ovhd5BleachNextDay) || 0));
      this.calculatedData[index]["bleachTotal"] = isNaN(bleachTotal) ? '' : (bleachTotal * 10).toFixed(1);
      return isNaN(bleachTotal) ? '' : (bleachTotal * 10).toFixed(1);
    },
    calculateLas: function(index) {
      var espslasNextDay  = (index === this.data.length - 1) ? this.nextMonth.esps_las  : this.data[index + 1].esps_las;
      var sspslasNextDay  = (index === this.data.length - 1) ? this.nextMonth.ssps_las  : this.data[index + 1].ssps_las;
      var mwpslasNextDay  = (index === this.data.length - 1) ? this.nextMonth.mwps_las  : this.data[index + 1].mwps_las;
      var ovhd1lasNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd1_las : this.data[index + 1].ovhd1_las;
      var ovhd2lasNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd2_las : this.data[index + 1].ovhd2_las;
      var ovhd3lasNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd3_las : this.data[index + 1].ovhd3_las;
      var ovhd4lasNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd4_las : this.data[index + 1].ovhd4_las;
      var ovhd5lasNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd5_las : this.data[index + 1].ovhd5_las;

      var lasTotal = ((parseFloat(this.data[index].esps_las) || 0) - (parseFloat(espslasNextDay) || 0))
                      + ((parseFloat(this.data[index].mwps_las) || 0) - (parseFloat(mwpslasNextDay) || 0))
                      + ((parseFloat(this.data[index].ssps_las) || 0) - (parseFloat(sspslasNextDay) || 0))
                      + ((parseFloat(this.data[index].ovhd1_las) || 0) - (parseFloat(ovhd1lasNextDay) || 0))
                      + ((parseFloat(this.data[index].ovhd2_las) || 0) - (parseFloat(ovhd2lasNextDay) || 0))
                      + ((parseFloat(this.data[index].ovhd3_las) || 0) - (parseFloat(ovhd3lasNextDay) || 0))
                      + ((parseFloat(this.data[index].ovhd4_las) || 0) - (parseFloat(ovhd4lasNextDay) || 0))
                      + ((parseFloat(this.data[index].ovhd5_las) || 0) - (parseFloat(ovhd5lasNextDay) || 0));
      this.calculatedData[index]["lasTotal"] = isNaN(lasTotal) ? '' : (lasTotal * 10).toFixed(1);
      return isNaN(lasTotal) ? '' : (lasTotal * 10).toFixed(1);
    },
    toDecimal: function(number, decimal) {
      if (isNaN(parseFloat(number))) {
          return ''
      } else {
        return parseFloat(number).toFixed(decimal);
      }
    },
    findAmmLevel: function(tank) {
      var self = this;
      var tankLevel;
      // Step backwards to find last non-null entry
      for(var i = self.data.length - 1; i >= 0; i--) {
        if (self.data[i][tank] !==  null) {
          tankLevel = self.data[i][tank];
          break;
        }
      }
      return tankLevel;
    },
    checkChlorineChange: function() {
      var self = this;
      var online = [];
      var full = 0;
      var empty = 0;
      var changeDetected = false;
      // Check if B side or A side starting and ending
      var startingSide = (self.data[0].Cl2_Tanks_B1_Start !== '' && self.data[0].Cl2_Tanks_B2_Start !== '' && self.data[0].Cl2_Tanks_B3_Start !== '' && self.data[0].Cl2_Tanks_B1_Start != undefined && self.data[0].Cl2_Tanks_B2_Start != undefined && self.data[0].Cl2_Tanks_B3_Start != undefined) ? 'B' : 'A';
      var endingSide = (self.data.slice(-1).Cl2_Tanks_B1_End !== '' && self.data.slice(-1).Cl2_Tanks_B2_End !== '' && self.data.slice(-1).Cl2_Tanks_B3_End !== '' && self.data.slice(-1).Cl2_Tanks_B1_End != undefined && self.data.slice(-1).Cl2_Tanks_B2_End != undefined && self.data.slice(-1).Cl2_Tanks_B3_End != undefined) ? 'B' : 'A';
      console.log(startingSide);
      console.log(endingSide);
      self.data.forEach(function(row, idx) {
        // check if B or A side for each day
        var startingSideDaily = (self.data[idx].Cl2_Tanks_B1_Start !== '' && self.data[idx].Cl2_Tanks_B2_Start !== '' && self.data[idx].Cl2_Tanks_B3_Start !== '' && self.data[idx].Cl2_Tanks_B1_Start != undefined && self.data[idx].Cl2_Tanks_B2_Start != undefined && self.data[idx].Cl2_Tanks_B3_Start != undefined) ? 'B' : 'A';
        var endingSideDaily = (self.data[idx].Cl2_Tanks_B1_End !== '' && self.data[idx].Cl2_Tanks_B2_End !== '' && self.data[idx].Cl2_Tanks_B3_End !== '' && self.data[idx].Cl2_Tanks_B1_End != undefined && self.data[idx].Cl2_Tanks_B2_End != undefined && self.data[idx].Cl2_Tanks_B3_End != undefined) ? 'B' : 'A';
        changeDetected = (startingSideDaily !== endingSideDaily);
      });
      // if no daily change detected, check for a weekly change.
      if (!changeDetected) {
        changeDetected = (startingSide !== endingSide);
      }
      // if no change detected see if chlorine is running, if so count tanks online
      if (!changeDetected) {
        let tankUsages = [[], [], [], [], [], []];
        
        for(var i = 0; i < 7; i++) {
          for(var j = 0; j < 3; j++) {
            var keyA = 'Cl2_Tanks_A' + (j + 4) + '_End';
            var keyB = 'Cl2_Tanks_B' + (j + 1) + '_End';
          
            tankUsages[j + 3].push(self.data[i][keyA]);
            tankUsages[j].push(self.data[i][keyB]);
          }
        }
        // look for weight changes in each tank and push on to online if there is a significant enough change.
        tankUsages.forEach((tank, idx) => {
          let end = parseInt(tank[-1]) || 0;
          let start = parseInt(tank[0]) || 0;
          
          if (Math.abs(end - start) > 10) {
            online.push(idx + 1);
          }
        });
      } else {
        for(var i = 0; i < 3; i++) {
          var keyA = 'Cl2_Tanks_A' + (i + 4) + '_End';
          var keyB = 'Cl2_Tanks_B' + (i + 1) + '_End';
          //console.log(keyA)
          //console.log(keyB)
          if (self.data.slice(-1)[keyA] !== '' && self.data.slice(-1)[keyA] != undefined && self.data.slice(-1)[keyA] !== null) {

            online.push(i + 1);
          }
          if (self.data.slice(-1)[keyB] !== '' && self.data.slice(-1)[keyB] != undefined && self.data.slice(-1)[keyB] !== null) {
            online.push(i + 4);
          }
        }
      }
 
      if (changeDetected) {
        full = 0;
        empty = 6 - online.length;
      } else {
        full = 6 - online.length;
      }

      console.log(online)
      return {full: full, online: online.length, empty: empty}
    },
    chems: function(key) {
      var self = this;
      var final = 'N/A';
      // Step back until a non-null value is found else N/A
      for (var i = self.data.length - 1; i >= 0; i--) {
        var chem = self.data[i][key];
        if (chem != undefined) {
          final = chem;
          break;
        }
      }
      return final;
    },
  }
})
