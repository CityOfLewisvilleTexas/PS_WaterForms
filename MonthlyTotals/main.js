
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
    loading: false,
    record: '',
    data: [],
    dailyDifferences: [],
    monthlyTotals: [],
    previousMonth: [],
    calculatedData: [],
    date: '',
    month: '',
    monthParam: '',
    yearParam: '',
    currentTab: 'Monthly1',
    electricalData: [],
    previousYearElectrical: [],
    personnel: [],
  },
  created: function() {
    this.loading = true;
    this.monthParam = $.QueryString["Month"];
    this.yearParam = $.QueryString["Year"];
    this.date = this.pad(parseInt(this.monthParam) + 1, 2) + '/01/' + this.yearParam;
    console.log(this.date);
    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;
      // New v2 request format, don't use citydata anymore
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewMonthlyCompositeReport',
          Year : self.yearParam,
          Month : self.monthParam,
      }, function(data) {

        self.loading = false;
        self.month = months[parseInt(self.monthParam) - 1];
        self.data = data[0].slice(1);
        for (var i = 0; i < self.data.length; i++) {
          self.calculatedData.push({});
        }
        self.previousMonth = data[0][0];
        self.nextMonth = data[0].pop();

        self.dailyDifferences = data[1];
        self.monthlyTotals = data[2];

        console.log(self.dailyDifferences);
        console.log(self.monthlyTotals);
        console.log(self.data);
        console.log(self.previousMonth);

        // Do all daily calculations from MonCompReport:
        for (var index = 0; index < self.data.length; index++) {
          self.calculateChem('ferric', index)
          self.calculateChem('lime', index)
          self.calculateChem('chlorine', index)
          self.calculateChem('ammonia', index)
          self.calculateChem('carbon', index)
          self.calculateChem('polymer', index)
          self.calculateBleach(index)
          self.calculateLas(index)
          self.combinedTotal("finished", "ns_vault", index, 'thousandths')
          self.combinedTotal("raw_vault", null, index, 'thousandths')
        }
      });
      
      // Get personnel
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewWaterPersonnel',
      }, function(data) {
        self.personnel = data[0][0];
        console.log(self.personnel)
      });
      
      $.post('https://query.cityoflewisville.com/v2/', {
            webservice : 'Public Services/Water/viewYearlyWaterElectrical',
            Year : self.yearParam,
        }, function(data) {
          self.electricalData = data[0].slice(1);
          self.previousYearElectrical = data[0][0];
          console.log(data[0]);
        });
    },
    getDifference: function(value, index) {
      var previous = (index > 0) ? parseFloat(this.data[index - 1][value]) : parseFloat(this.previousMonth[value]);
      var current = parseFloat(this.data[index][value])
      if (isNaN(previous) || isNaN(current)) {
        return '';
      } else {
        return (current - previous).toFixed(1);
      }

    },
    getAdjustedTotal: function(value) {
      var self = this;
      var total = 0;
      this.data.forEach(function(month, index) {
        total += parseFloat(self.getDifference(value, index)) || 0;
        // debugger;
      });
      return parseFloat(total).toFixed(1);
    },
    getTotal: function(value) {
      var self = this;
      var total = 0;
      self.data.forEach(function(day, index) {
        total += parseFloat(day[value]) || 0;
      });
      return parseFloat(total).toFixed(1);
    },
    calculateDiffElect: function(key, index) {
      var previous = (index > 0) ? parseFloat(this.electricalData[index - 1][key]) : parseFloat(this.previousYearElectrical[key]);
      var current = parseFloat(this.electricalData[index][key])
      if (isNaN(previous) || isNaN(current)) {
        return '0.0';
      } else {
        var diff = 0.0;
        if (current < previous) {
          diff = (current + 100000) - previous;
        } else {
          diff = current - previous;
        }
        return (diff).toFixed(0);
      }
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
        var lime_s = isNaN(parseFloat(self.data[index].Lime_2N)) ? 0 : parseFloat(self.data[index].Lime_2N);
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
        total = carbon * 50;
      } else if (value === 'polymer') {
        var polymer = self.calculatePoly(index);
        total = polymer;
      }
      total = Math.round(total);
      this.calculatedData[index][value] = total;
      return total;
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
          indexMin = i + 1;
        }else {
          total += tempVal;
          if (tempVal < min) { 
            min = tempVal; 
            indexMin = i + 1;
          }
          if (tempVal > max) { 
            max = tempVal;
            indexMax = i + 1;
          }
          avgCount++;
        }
      }
      avg = (avgCount === 0) ? 0.00 : (total / avgCount);
      return {total: total.toFixed(2), avg: avg.toFixed(2), min: min.toFixed(2), max: max.toFixed(2), indexMin: indexMin, indexMax: indexMax};
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
    calculateBleach: function(index) {
      var espsBleachNextDay = (index === this.data.length - 1) ? this.nextMonth.esps_bleach : this.data[index + 1].esps_bleach;
      var sspsBleachNextDay = (index === this.data.length - 1) ? this.nextMonth.ssps_bleach : this.data[index + 1].ssps_bleach;
      var mwpsBleachNextDay = (index === this.data.length - 1) ? this.nextMonth.mwps_bleach : this.data[index + 1].mwps_bleach;
      var ovhd1BleachNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd1_bleach : this.data[index + 1].ovhd1_bleach;
      var ovhd2BleachNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd2_bleach : this.data[index + 1].ovhd2_bleach;
      var ovhd3BleachNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd3_bleach : this.data[index + 1].ovhd3_bleach;
      var ovhd4BleachNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd4_bleach : this.data[index + 1].ovhd4_bleach;
      var ovhd5BleachNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd5_bleach : this.data[index + 1].ovhd5_bleach;

//      var bleachTotal = ((parseFloat(this.data[index].esps_bleach) || 0) - (parseFloat(this.data[index].esps_bleach_empty) || 0) + (parseFloat(this.data[index].esps_bleach_new) || 0) - (parseFloat(espsBleachNextDay) || 0))
//                        + ((parseFloat(this.data[index].mwps_bleach) || 0) - (parseFloat(this.data[index].mwps_bleach_empty) || 0) + (parseFloat(this.data[index].mwps_bleach_new) || 0) - (parseFloat(mwpsBleachNextDay) || 0))
//                        + ((parseFloat(this.data[index].ssps_bleach) || 0) - (parseFloat(this.data[index].ssps_bleach_empty) || 0) + (parseFloat(this.data[index].ssps_bleach_new) || 0) - (parseFloat(sspsBleachNextDay) || 0))
//                        + ((parseFloat(this.data[index].ovhd1_bleach) || 0) - (parseFloat(this.data[index].ovhd1_bleach_empty) || 0) + (parseFloat(this.data[index].ovhd1_bleach_new) || 0) - (parseFloat(ovhd1BleachNextDay) || 0))
//                        + ((parseFloat(this.data[index].ovhd2_bleach) || 0) - (parseFloat(this.data[index].ovhd2_bleach_empty) || 0) + (parseFloat(this.data[index].ovhd2_bleach_new) || 0) - (parseFloat(ovhd2BleachNextDay) || 0))
//                        + ((parseFloat(this.data[index].ovhd3_bleach) || 0) - (parseFloat(this.data[index].ovhd3_bleach_empty) || 0) + (parseFloat(this.data[index].ovhd3_bleach_new) || 0) - (parseFloat(ovhd3BleachNextDay) || 0))
//                        + ((parseFloat(this.data[index].ovhd4_bleach) || 0) - (parseFloat(this.data[index].ovhd4_bleach_empty) || 0) + (parseFloat(this.data[index].ovhd4_bleach_new) || 0) - (parseFloat(ovhd4BleachNextDay) || 0))
//                        + ((parseFloat(this.data[index].ovhd5_bleach) || 0) - (parseFloat(this.data[index].ovhd5_bleach_empty) || 0) + (parseFloat(this.data[index].ovhd5_bleach_new) || 0) - (parseFloat(ovhd5BleachNextDay) || 0));
      
      var bleachTotal = ((((parseFloat(this.data[index].esps_bleach)  || 0) >= (parseFloat(espsBleachNextDay)  || 0))) ? ((parseFloat(this.data[index].esps_bleach)  || 0) - (parseFloat(espsBleachNextDay))  || 0) : 0)
                      + ((((parseFloat(this.data[index].mwps_bleach)  || 0) >= (parseFloat(mwpsBleachNextDay)  || 0))) ? ((parseFloat(this.data[index].mwps_bleach)  || 0) - (parseFloat(mwpsBleachNextDay))  || 0) : 0)
                      + ((((parseFloat(this.data[index].ssps_bleach)  || 0) >= (parseFloat(sspsBleachNextDay)  || 0))) ? ((parseFloat(this.data[index].ssps_bleach)  || 0) - (parseFloat(sspsBleachNextDay))  || 0) : 0)
                      + ((((parseFloat(this.data[index].ovhd1_bleach)  || 0) >= (parseFloat(ovhd1BleachNextDay)  || 0))) ? ((parseFloat(this.data[index].ovhd1_bleach)  || 0) - (parseFloat(ovhd1BleachNextDay))  || 0) : 0)
                      + ((((parseFloat(this.data[index].ovhd2_bleach)  || 0) >= (parseFloat(ovhd2BleachNextDay)  || 0))) ? ((parseFloat(this.data[index].ovhd2_bleach)  || 0) - (parseFloat(ovhd2BleachNextDay))  || 0) : 0)
                      + ((((parseFloat(this.data[index].ovhd3_bleach)  || 0) >= (parseFloat(ovhd3BleachNextDay)  || 0))) ? ((parseFloat(this.data[index].ovhd3_bleach)  || 0) - (parseFloat(ovhd3BleachNextDay))  || 0) : 0)
                      + ((((parseFloat(this.data[index].ovhd4_bleach)  || 0) >= (parseFloat(ovhd4BleachNextDay)  || 0))) ? ((parseFloat(this.data[index].ovhd4_bleach)  || 0) - (parseFloat(ovhd4BleachNextDay))  || 0) : 0)
                      + ((((parseFloat(this.data[index].ovhd5_bleach)  || 0) >= (parseFloat(ovhd5BleachNextDay)  || 0))) ? ((parseFloat(this.data[index].ovhd5_bleach)  || 0) - (parseFloat(ovhd5BleachNextDay))  || 0) : 0);
      
      this.calculatedData[index]["bleachTotal"] = isNaN(bleachTotal) ? '' : (bleachTotal * 10).toFixed(1);
      return isNaN(bleachTotal) ? '' : (bleachTotal * 10).toFixed(1);
    },
    calculateLas: function(index) {
      var espslasNextDay = (index === this.data.length - 1) ? this.nextMonth.esps_las : this.data[index + 1].esps_las;
      var sspslasNextDay = (index === this.data.length - 1) ? this.nextMonth.ssps_las : this.data[index + 1].ssps_las;
      var mwpslasNextDay = (index === this.data.length - 1) ? this.nextMonth.mwps_las : this.data[index + 1].mwps_las;
      var ovhd1lasNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd1_las : this.data[index + 1].ovhd1_las;
      var ovhd2lasNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd2_las : this.data[index + 1].ovhd2_las;
      var ovhd3lasNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd3_las : this.data[index + 1].ovhd3_las;
      var ovhd4lasNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd4_las : this.data[index + 1].ovhd4_las;
      var ovhd5lasNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd5_las : this.data[index + 1].ovhd5_las;

//      var lasTotal = ((parseFloat(this.data[index].esps_las) || 0) - (parseFloat(espslasNextDay) || 0))
//                      + ((parseFloat(this.data[index].mwps_las) || 0) - (parseFloat(mwpslasNextDay) || 0))
//                      + ((parseFloat(this.data[index].ssps_las) || 0) - (parseFloat(sspslasNextDay) || 0))
//                      + ((parseFloat(this.data[index].ovhd1_las) || 0) - (parseFloat(ovhd1lasNextDay) || 0))
//                      + ((parseFloat(this.data[index].ovhd2_las) || 0) - (parseFloat(ovhd2lasNextDay) || 0))
//                      + ((parseFloat(this.data[index].ovhd3_las) || 0) - (parseFloat(ovhd3lasNextDay) || 0))
//                      + ((parseFloat(this.data[index].ovhd4_las) || 0) - (parseFloat(ovhd4lasNextDay) || 0))
//                      + ((parseFloat(this.data[index].ovhd5_las) || 0) - (parseFloat(ovhd5lasNextDay) || 0));
      
      var lasTotal =     (((parseFloat(this.data[index].esps_las)  || 0) >= (parseFloat(espslasNextDay)  || 0)) ? ((parseFloat(this.data[index].esps_las) || 0) - (parseFloat(espslasNextDay)) || 0) : 0)
                      + (((parseFloat(this.data[index].mwps_las)  || 0) >= (parseFloat(mwpslasNextDay)  || 0)) ? ((parseFloat(this.data[index].mwps_las) || 0) - (parseFloat(mwpslasNextDay)) || 0) : 0)
                      + (((parseFloat(this.data[index].ssps_las)  || 0) >= (parseFloat(sspslasNextDay)  || 0)) ? ((parseFloat(this.data[index].ssps_las) || 0) - (parseFloat(sspslasNextDay)) || 0) : 0)
                      + (((parseFloat(this.data[index].ovhd1_las)  || 0) >= (parseFloat(ovhd1lasNextDay)  || 0)) ? ((parseFloat(this.data[index].ovhd1_las) || 0) - (parseFloat(ovhd1lasNextDay)) || 0) : 0)
                      + (((parseFloat(this.data[index].ovhd2_las)  || 0) >= (parseFloat(ovhd2lasNextDay)  || 0)) ? ((parseFloat(this.data[index].ovhd2_las) || 0) - (parseFloat(ovhd2lasNextDay)) || 0) : 0)
                      + (((parseFloat(this.data[index].ovhd3_las)  || 0) >= (parseFloat(ovhd3lasNextDay)  || 0)) ? ((parseFloat(this.data[index].ovhd3_las) || 0) - (parseFloat(ovhd3lasNextDay)) || 0) : 0)
                      + (((parseFloat(this.data[index].ovhd4_las)  || 0) >= (parseFloat(ovhd4lasNextDay)  || 0)) ? ((parseFloat(this.data[index].ovhd4_las) || 0) - (parseFloat(ovhd4lasNextDay)) || 0) : 0)
                      + (((parseFloat(this.data[index].ovhd5_las)  || 0) >= (parseFloat(ovhd5lasNextDay)  || 0)) ? ((parseFloat(this.data[index].ovhd5_las) || 0) - (parseFloat(ovhd5lasNextDay)) || 0) : 0);
      
      this.calculatedData[index]["lasTotal"] = isNaN(lasTotal) ? '' : (lasTotal * 10).toFixed(1);
      return isNaN(lasTotal) ? '' : (lasTotal * 10).toFixed(1);
    },
    calculatePoly: function(index) {
      var polyToday = this.data[index].poly_drumweight;
      var polyNextDay = (index === this.data.length - 1) ? this.nextMonth.poly_drumweight : this.data[index + 1].poly_drumweight;
      var polyTotal = (parseFloat(polyToday) || 0) - (parseFloat(this.data[index].poly_weight_empty) || 0) + (parseFloat(this.data[index].poly_weight_new) || 0) - (parseFloat(polyNextDay) || 0);

      return isNaN(polyTotal) ? '' : polyTotal.toFixed(1);
    },
    calculateDallasWater: function() {
      var self = this;
      var length = self.data.length;
      // ESPS
      var lastMonthESPS = parseFloat(self.previousMonth.esps_dallas_meters) || 0;
      var EndofMonthESPS = parseFloat(self.data[length - 2].esps_dallas_meters) || 0;
      var totalESPS = (EndofMonthESPS - lastMonthESPS) / 1000;
      
      // MWPS
      var lastMonthMWPS = parseFloat(self.previousMonth.mwps_dallas_meters) || 0;
      var EndofMonthMWPS = parseFloat(self.data[length - 2].mwps_dallas_meters) || 0;
      var totalMWPS = (EndofMonthMWPS - lastMonthMWPS) / 1000;
      
      // SSPS
      var lastMonthSSPS = parseFloat(self.previousMonth.ssps_dallas_meters) || 0;
      var EndofMonthSSPS = parseFloat(self.data[length - 2].ssps_dallas_meters) || 0;
      var totalSSPS = (EndofMonthSSPS - lastMonthSSPS) / 1000;
      
      // Total Dallas Water
      return (totalESPS + totalMWPS + totalSSPS).toFixed(2);
    },
    calculateLewMeters: function() {
      var self = this;
      var length = self.data.length;
      // ESPS
      var lastMonthESPS = parseFloat(self.previousMonth.esps_lewisville_meters) || 0;
      var EndofMonthESPS = parseFloat(self.data[length - 2].esps_lewisville_meters) || 0;
      var totalESPS = (EndofMonthESPS - lastMonthESPS) / 1000;
      
      // ESBS
      var lastMonthESBS = parseFloat(self.previousMonth.esbs_lewisville_meters) || 0;
      var EndofMonthESBS = parseFloat(self.data[length - 2].esbs_lewisville_meters) || 0;
      var totalESBS = (EndofMonthESBS - lastMonthESBS) / 1000;
      
      // MWPS
      var lastMonthMWPS = parseFloat(self.previousMonth.mwps_lewisville_meters) || 0;
      var EndofMonthMWPS = parseFloat(self.data[length - 2].mwps_lewisville_meters) || 0;
      var totalMWPS = (EndofMonthMWPS - lastMonthMWPS) / 1000;
      
      // SSPS
      var lastMonthSSPS = parseFloat(self.previousMonth.ssps_lewisville_meters) || 0;
      var EndofMonthSSPS = parseFloat(self.data[length - 2].ssps_lewisville_meters) || 0;
      var totalSSPS = (EndofMonthSSPS - lastMonthSSPS) / 1000;
      
      // Total Dallas Water
      return {esps: totalESPS.toFixed(2), esbs: totalESBS.toFixed(2), ssps: totalSSPS.toFixed(2), mwps: totalMWPS.toFixed(2),}
    },
    pad: function(num, size) {
      var s = "00" + num;
      return s.substr(s.length-size);
    },
    calculateMonthlyMeterTotal: function(city) {
      var self = this;
      var total;
      if (city === 'Dallas') {
        var mwps = parseFloat(self.columnCalc('mwps_lewisville_meters')) || 0;
        var ssps = parseFloat(self.calculateMeterMonthlyDiff('ssps_dallas_meters')) || 0;
        var esps = parseFloat(self.calculateMeterMonthlyDiff('esps_dallas_meters')) || 0;

        total = (mwps + ssps + esps).toFixed(2);
      } else if (city === 'Lewisville') {
        var mwps = parseFloat(self.columnCalc('mwps_dallas_meters')) || 0;
        var ssps = parseFloat(self.calculateMeterMonthlyDiff('ssps_lewisville_meters')) || 0;
        var esps = parseFloat(self.calculateMeterMonthlyDiff('esps_lewisville_meters')) || 0;
        var esbs = parseFloat(self.calculateMeterMonthlyDiff('esbs_lewisville_meters')) || 0;

        total = (mwps + ssps + esps + esbs).toFixed(2);
      }
      return total;
    },
    calculateMeterMonthlyDiff: function(key) {
      var self = this;
      var lastMonth = parseFloat(self.previousMonth[key]) || 0;
      console.log(lastMonth)
      var thisMonth = parseFloat(self.data.slice(-2)[0][key]) || 0;
      console.log(thisMonth)
      var total;
      if (key === 'ssps_dallas_meters') {
        total = self.difference(thisMonth, lastMonth, (self.data.length - 1), key) * 2;
      } else {
        total = self.difference(thisMonth, lastMonth, (self.data.length - 1), key);
      }
      return total;
    },
    difference: function(currentValue, previousValue, index, key) {
      var self = this;
      var total;
      if (!isNaN(currentValue) && !isNaN(previousValue)) {
        // Account for meter rollover:
        if (currentValue < previousValue) {
          //console.log('rollover: ' + key)
          currentValue = currentValue + 1000000;
          total = (currentValue - previousValue) / 1000;
        } else {
          total = (currentValue - previousValue) / 1000;
        }
        
        self.calculatedData[index][key] = isNaN(total) ? '' : total.toFixed(2);
        
        return isNaN(total) ? '' : total.toFixed(2);
      }
    },
  }
})
