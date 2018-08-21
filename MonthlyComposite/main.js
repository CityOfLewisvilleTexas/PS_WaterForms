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
    loading: false,
    record: '',
    data: [],
    previousMonth: [],
    nextMonth: [],
    calculatedData: [],
    date: '',
    month: '',
    monthParam: '',
    yearParam: '',
    currentTab: 'Monthly1',
    dataForSave: [{}],
    psofia: '',
    needsUpdate: false,
  },
  created: function() {
    this.loading = true;
    this.monthParam = $.QueryString["Month"];
    this.yearParam = $.QueryString["Year"];
    this.fetchData();
    this.psofia = new Psofia('62');
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
        var date = new Date(data[0][2].day); // timezone is an issue when creating a new date object. the third record should be the correct month.
        self.loading = false;
        self.month = months[date.getMonth()];
        self.data = data[0].slice(1, -1);
        for (var i = 0; i < self.data.length; i++) {
          self.calculatedData.push({});
        }
        self.dataForSave[0]['_date'] = self.yearParam + '-' + self.monthParam + '-01';
        self.previousMonth = data[0][0];
        self.nextMonth = data[0].pop();
        console.log(self.data);
        console.log(self.previousMonth);
        console.log(self.nextMonth);
        
        // go ahead and check if needsUpdate after render
        self.$nextTick(() => {
           self.psofia.setData(self.dataForSave[0], null);

            var diff = self.psofia._objectDiff(self.psofia.originalData, self.psofia.data);

            if (diff.length > 0) {
              self.needsUpdate = true;
            }
            // set up datatables for scrolling table body
            $(document).ready(function() {
              $('table.display').DataTable( {
                "scrollY": 600,
                "scrollCollapse": true,
                "scrollX": true,
                "paging": false,
                "search":false,
                "bFilter": false,
                "bSort": false,
              });
            });

            // $(document).on('shown.bs.tab', 'a[data-toggle="tab"]', function (e) {
            //   $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
            // });
        })      
      });
      
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewWaterMonthlyTotals',
          Year : self.yearParam,
          Month: self.monthParam
      }, function(data) {
        console.log(data[0][0]);
        
        if (data[0].length > 0) {
          self.psofia.setOriginalData(data[0][0]);
          self.record = data[0][0].psofia_recordid;
          self.dataForSave[0]['psofia_recordid'] = data[0][0].psofia_recordid;
        }
      });
    },
    formatDate: function(dateStr) {
      let month = moment.utc(dateStr).get('month') + 1;
      let day = moment.utc(dateStr).get('date');
      return month + '/' + day;
    },
    changeTab: function(tabName) {
      this.currentTab = tabName;
      this.$nextTick(() => {
        $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
      });
    },
    getDifference: function(value, index) { // Get difference between today and previous days value
      var final;
      var previous = (index > 0) ? parseFloat(this.data[index - 1][value]) : parseFloat(this.previousMonth[value]);
      var current = parseFloat(this.data[index][value])
      final = (isNaN(previous) || isNaN(current)) ?  '' : (current - previous).toFixed(1);
      this.calculatedData[index][value] = final;
      return final;
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
        total = carbon * 50 / 24;
      } else if (value === 'polymer') {
        var polymer = self.calculatePoly(index);
        total = polymer;
      }
      total = Math.round(total);
      this.calculatedData[index][value] = total;
      return total;
    },
    calculateMg: function(value, index) { // calculate the daily mg dosage for a certain chem. based on raw flow and chem lbs usage calculated above.
      var total;
      var keyString = value + '_mg';
      var flow = parseFloat(this.combinedTotal("raw_vault", null, index, 'thousandths'));
      total = this.calculateChem(value, index);
      total = isNaN(flow) ? 0 : (total / (flow * 8.34)).toFixed(1);
      this.calculatedData[index][keyString] = isNaN(total) ? 0 : total;
      return isNaN(total) ? 0 : total;
    },
    average: function(value1, value2, index) {
      var final, first, second, self = this;
      // for filter turb, only average online filters.
      if ((value1 === 'NFilt_Turbidity' || value1 === 'SFilt_Turbidity') && (value2 === 'NFilt_Turbidity' || value2 === 'SFilt_Turbidity')) {
        first = 0;
        second = 0;
        northCount = 0;
        southCount = 0;
        for (var i = 1; i <= 8; i++) {
          if (i <= 4) {
            first += isNaN(parseFloat(this.data[index]['NFiltTurb_' + i])) ? 0 : parseFloat(this.data[index]['NFiltTurb_' + i]);
            if (!isNaN(parseFloat(this.data[index]['NFiltTurb_' + i]))) {northCount++};
          } else {
            second += isNaN(parseFloat(this.data[index]['SFiltTurb_' + i])) ? 0 : parseFloat(this.data[index]['SFiltTurb_' + i]);
            if (!isNaN(parseFloat(this.data[index]['SFiltTurb_' + i]))) {southCount++};
          }
        }
        first = (isNaN(first / northCount)) ? 0 : first / northCount;
        second = (isNaN(second / southCount)) ? 0 : second / southCount;
      } else {
        first = parseFloat(this.data[index][value1]) || 0;
        second = parseFloat(this.data[index][value2]) || 0;
      }
      
      if (first !== 0 && second !== 0) {
        final = ((first + second) / 2).toFixed(2);
      } else if (first === 0 && second !== 0) {
        final = second.toFixed(2);
      } else if (first !== 0 && second === 0) {
        final = first.toFixed(2);
      } else {
        final = '';
      }
      
      this.calculatedData[index][value1] = final;
      return final;
    },
    decimalPlaces: function(value, index, decimalPlaces) {
      var decimalValue = parseFloat(this.data[index][value]).toFixed(decimalPlaces);
      var final = isNaN(decimalValue) ? '' : decimalValue;
      this.calculatedData[index][value] = final;
      return final;
    },
    columnCalc: function(value) {
      var self = this;
      var total = 0.0;
      var avg = 0.0;
      var avgCount = 0;
      var min = 100.0;
      var max = 0.0;
      var tempVal;

      for (var i = 0; i < self.data.length; i++) {
        tempVal = parseFloat(self.calculatedData[i][value]);
        if (isNaN(tempVal)) {
          min = 0.0;
        }else {
          total += tempVal;
          if (tempVal < min) { min = tempVal; }
          if (tempVal > max) { max = tempVal; }
          avgCount++;
        }
      }
      self.dataForSave[0][value] = "total: " + total.toFixed(2) + ", avg: " + avg.toFixed(2);
      avg = (avgCount === 0) ? 0.00 : (total / avgCount);
      return {total: total.toFixed(2), avg: avg.toFixed(2), min: min.toFixed(2), max: max.toFixed(2)};
    },
    pushOnToCalculated: function(valueName, index) {
      var value = this.data[index][valueName];
      this.calculatedData[index][valueName] = value;
      return isNaN(parseFloat(value)) ? '' : parseFloat(value).toFixed(2);
    },
    numberFiltersBW: function(index) {
      var self = this;
      for (var i = 0; i < 8; i++) {
        var key = 'filt' + (i + 1) + '_bw';
        var count = 0;
        var value = self.data[index][key]
        if (value && value != null) {
          count ++
        }
        self.calculatedData[index]["filters_bw"] = count;
        return count.toFixed(0); 
      }
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

      var bleachTotal = ((((parseFloat(this.data[index].esps_bleach)  || 0) >= (parseFloat(espsBleachNextDay)  || 0))) ? ((parseFloat(this.data[index].esps_bleach)  || 0) - (parseFloat(espsBleachNextDay))  || 0) : 0)
                      + ((((parseFloat(this.data[index].mwps_bleach)  || 0) >= (parseFloat(mwpsBleachNextDay)  || 0))) ? ((parseFloat(this.data[index].mwps_bleach)  || 0) - (parseFloat(mwpsBleachNextDay))  || 0) : 0)
                      + ((((parseFloat(this.data[index].ssps_bleach)  || 0) >= (parseFloat(sspsBleachNextDay)  || 0))) ? ((parseFloat(this.data[index].ssps_bleach)  || 0) - (parseFloat(sspsBleachNextDay))  || 0) : 0)
                      + ((((parseFloat(this.data[index].ovhd1_bleach)  || 0) >= (parseFloat(ovhd1BleachNextDay)  || 0))) ? ((parseFloat(this.data[index].ovhd1_bleach)  || 0) - (parseFloat(ovhd1BleachNextDay))  || 0) : 0)
                      + ((((parseFloat(this.data[index].ovhd2_bleach)  || 0) >= (parseFloat(ovhd2BleachNextDay)  || 0))) ? ((parseFloat(this.data[index].ovhd2_bleach)  || 0) - (parseFloat(ovhd2BleachNextDay))  || 0) : 0)
                      + ((((parseFloat(this.data[index].ovhd3_bleach)  || 0) >= (parseFloat(ovhd3BleachNextDay)  || 0))) ? ((parseFloat(this.data[index].ovhd3_bleach)  || 0) - (parseFloat(ovhd3BleachNextDay))  || 0) : 0)
                      + ((((parseFloat(this.data[index].ovhd4_bleach)  || 0) >= (parseFloat(ovhd4BleachNextDay)  || 0))) ? ((parseFloat(this.data[index].ovhd4_bleach)  || 0) - (parseFloat(ovhd4BleachNextDay))  || 0) : 0)
                      + ((((parseFloat(this.data[index].ovhd5_bleach)  || 0) >= (parseFloat(ovhd5BleachNextDay)  || 0))) ? ((parseFloat(this.data[index].ovhd5_bleach)  || 0) - (parseFloat(ovhd5BleachNextDay))  || 0) : 0);
//          
//      var bleachTotal =   ((parseFloat(this.data[index].esps_bleach)  || 0) - (parseFloat(this.data[index].esps_bleach_empty)  || 0) + (parseFloat(this.data[index].esps_bleach_new)  || 0) - (parseFloat(espsBleachNextDay)  || 0))
//                        + ((parseFloat(this.data[index].mwps_bleach)  || 0) - (parseFloat(this.data[index].mwps_bleach_empty)  || 0) + (parseFloat(this.data[index].mwps_bleach_new)  || 0) - (parseFloat(mwpsBleachNextDay)  || 0))
//                        + ((parseFloat(this.data[index].ssps_bleach)  || 0) - (parseFloat(this.data[index].ssps_bleach_empty)  || 0) + (parseFloat(this.data[index].ssps_bleach_new)  || 0) - (parseFloat(sspsBleachNextDay)  || 0))
//                        + ((parseFloat(this.data[index].ovhd1_bleach) || 0) - (parseFloat(this.data[index].ovhd1_bleach_empty) || 0) + (parseFloat(this.data[index].ovhd1_bleach_new) || 0) - (parseFloat(ovhd1BleachNextDay) || 0))
//                        + ((parseFloat(this.data[index].ovhd2_bleach) || 0) - (parseFloat(this.data[index].ovhd2_bleach_empty) || 0) + (parseFloat(this.data[index].ovhd2_bleach_new) || 0) - (parseFloat(ovhd2BleachNextDay) || 0))
//                        + ((parseFloat(this.data[index].ovhd3_bleach) || 0) - (parseFloat(this.data[index].ovhd3_bleach_empty) || 0) + (parseFloat(this.data[index].ovhd3_bleach_new) || 0) - (parseFloat(ovhd3BleachNextDay) || 0))
//                        + ((parseFloat(this.data[index].ovhd4_bleach) || 0) - (parseFloat(this.data[index].ovhd4_bleach_empty) || 0) + (parseFloat(this.data[index].ovhd4_bleach_new) || 0) - (parseFloat(ovhd4BleachNextDay) || 0))
//                        + ((parseFloat(this.data[index].ovhd5_bleach) || 0) - (parseFloat(this.data[index].ovhd5_bleach_empty) || 0) + (parseFloat(this.data[index].ovhd5_bleach_new) || 0) - (parseFloat(ovhd5BleachNextDay) || 0));
      this.calculatedData[index]["bleachTotal"] = isNaN(bleachTotal) ? '' : (bleachTotal * 10).toFixed(1);
      return isNaN(bleachTotal) ? '' : (bleachTotal * 10).toFixed(1);
    },
    calculateLas: function(index) {
      var espslasNextDay =  (index === this.data.length - 1) ? this.nextMonth.esps_las  : this.data[index + 1].esps_las;
      var sspslasNextDay =  (index === this.data.length - 1) ? this.nextMonth.ssps_las  : this.data[index + 1].ssps_las;
      var mwpslasNextDay =  (index === this.data.length - 1) ? this.nextMonth.mwps_las  : this.data[index + 1].mwps_las;
      var ovhd1lasNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd1_las : this.data[index + 1].ovhd1_las;
      var ovhd2lasNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd2_las : this.data[index + 1].ovhd2_las;
      var ovhd3lasNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd3_las : this.data[index + 1].ovhd3_las;
      var ovhd4lasNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd4_las : this.data[index + 1].ovhd4_las;
      var ovhd5lasNextDay = (index === this.data.length - 1) ? this.nextMonth.ovhd5_las : this.data[index + 1].ovhd5_las;

      var lasTotal =     (((parseFloat(this.data[index].esps_las)  || 0) >= (parseFloat(espslasNextDay)  || 0)) ? ((parseFloat(this.data[index].esps_las) || 0) - (parseFloat(espslasNextDay)) || 0) : 0)
                      + (((parseFloat(this.data[index].mwps_las)  || 0) >= (parseFloat(mwpslasNextDay)  || 0)) ? ((parseFloat(this.data[index].mwps_las) || 0) - (parseFloat(mwpslasNextDay)) || 0) : 0)
                      + (((parseFloat(this.data[index].ssps_las)  || 0) >= (parseFloat(sspslasNextDay)  || 0)) ? ((parseFloat(this.data[index].ssps_las) || 0) - (parseFloat(sspslasNextDay)) || 0) : 0)
                      + (((parseFloat(this.data[index].ovhd1_las)  || 0) >= (parseFloat(ovhd1lasNextDay)  || 0)) ? ((parseFloat(this.data[index].ovhd1_las) || 0) - (parseFloat(ovhd1lasNextDay)) || 0) : 0)
                      + (((parseFloat(this.data[index].ovhd2_las)  || 0) >= (parseFloat(ovhd2lasNextDay)  || 0)) ? ((parseFloat(this.data[index].ovhd2_las) || 0) - (parseFloat(ovhd2lasNextDay)) || 0) : 0)
                      + (((parseFloat(this.data[index].ovhd3_las)  || 0) >= (parseFloat(ovhd3lasNextDay)  || 0)) ? ((parseFloat(this.data[index].ovhd3_las) || 0) - (parseFloat(ovhd3lasNextDay)) || 0) : 0)
                      + (((parseFloat(this.data[index].ovhd4_las)  || 0) >= (parseFloat(ovhd4lasNextDay)  || 0)) ? ((parseFloat(this.data[index].ovhd4_las) || 0) - (parseFloat(ovhd4lasNextDay)) || 0) : 0)
                      + (((parseFloat(this.data[index].ovhd5_las)  || 0) >= (parseFloat(ovhd5lasNextDay)  || 0)) ? ((parseFloat(this.data[index].ovhd5_las) || 0) - (parseFloat(ovhd5lasNextDay)) || 0) : 0);
          
//                        ((parseFloat(this.data[index].esps_las)  || 0) - (parseFloat(espslasNextDay)  || 0))
//                      + ((parseFloat(this.data[index].mwps_las)  || 0) - (parseFloat(mwpslasNextDay)  || 0))
//                      + ((parseFloat(this.data[index].ssps_las)  || 0) - (parseFloat(sspslasNextDay)  || 0))
//                      + ((parseFloat(this.data[index].ovhd1_las) || 0) - (parseFloat(ovhd1lasNextDay) || 0))
//                      + ((parseFloat(this.data[index].ovhd2_las) || 0) - (parseFloat(ovhd2lasNextDay) || 0))
//                      + ((parseFloat(this.data[index].ovhd3_las) || 0) - (parseFloat(ovhd3lasNextDay) || 0))
//                      + ((parseFloat(this.data[index].ovhd4_las) || 0) - (parseFloat(ovhd4lasNextDay) || 0))
//                      + ((parseFloat(this.data[index].ovhd5_las) || 0) - (parseFloat(ovhd5lasNextDay) || 0));
      this.calculatedData[index]["lasTotal"] = isNaN(lasTotal) ? '' : (lasTotal * 10).toFixed(1);
      return isNaN(lasTotal) ? '' : (lasTotal * 10).toFixed(1);
    },
    calculatePoly: function(index) {
      var polyToday = this.data[index].Poly_DrumWeight;
      var polyNextDay = (index === this.data.length - 1) ? this.nextMonth.Poly_DrumWeight : this.data[index + 1].Poly_DrumWeight;
      var polyTotal = (parseFloat(polyToday) || 0) - (parseFloat(this.data[index].poly_weight_empty) || 0) + (parseFloat(this.data[index].poly_weight_new) || 0) - (parseFloat(polyNextDay) || 0);

      return isNaN(polyTotal) ? '' : polyTotal.toFixed(1);
    },
    upload: function(event) {
      if (!confirm("Save roundsheet?")) {
        event.preventDefault();
      }
      var self = this;
      
      self.psofia.setData(self.dataForSave[0], null);
      self.record = self.psofia.save();
    },
    update: function(event) {
      if (!confirm("Save roundsheet?")) {
        event.preventDefault();
      }
      var self = this;
      
      self.psofia.setData(self.dataForSave[0], null);
      self.record = self.psofia.update();
      self.needsUpdate = false;
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
