$(".button-collapse").sideNav();

/*Preloader*/
// $(window).on('load', function() {
// 	setTimeout(function() {
// 	  $('body').addClass('loaded');
// 	}, 200);
// });


var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Vue.component('modal', {
//   template: '#modal-template'
// })

var $input = $('.datepicker').pickadate({
    selectMonths: true, // Creates a dropdown to control month
    selectYears: 15, // Creates a dropdown of 15 years to control year,
    format: 'yyyy-mm-dd',
    today: 'Today',
    clear: 'Clear',
    close: 'Ok',
    closeOnSelect: false // Close upon selecting a date,
  });
var picker = $input.pickadate('picker')
picker.set('select', new Date())
$('.datepicker').change(function() {
	app.date =  picker.get();

	app.date = moment(app.date.toString());

	app.year = app.date.year();

	app.month = app.date.month() + 1;
	app.month = (app.month < 10) ? '0' + app.month : app.month;

	app.day = app.date.date();
	app.day = (app.day < 10) ? '0' + app.day : app.day;
	app.fetchData();
	app.parseUrls();
})

// $("#switch").prop('checked')

// Chart Component:
Vue.component('line-chart', {
  extends: VueChartJs.Line,
  props: {
  	data: {
  		type: Object
  	}
  },
  
  mounted () {
  	var self = this;

    this.renderChart({
      labels: self.data.labels,
      datasets: self.data.datasets,
    }, {responsive: true, maintainAspectRatio: false})
  },
  watch: {
    data: function () {
      	this.$data._chart.destroy()
      	var self = this;
      	this.renderChart({
	      labels: self.data.labels,
	      datasets: self.data.datasets,
	    }, {responsive: true, maintainAspectRatio: false})
    }
  }
  
})

// Main App
var app = new Vue({
  el: '#main',
  data: {
    day: '',
    month: '',
    year: '',
    date: '',
    testDate: picker.get(),
    start_date: '2017-01-01',
    dateString: '',
    lastWeekDay: '',
    loading: true,
    data: [],
    lakelevel: '--',
    infChartData: {
  		labels: [],
  		datasets:[
  			{
  				label: 'Water',
	  			fillColor: "rgba(128, 222, 234, 0.6)",
				strokeColor: "#ffffff",
				pointColor: "#00bcd4",
				pointStrokeColor: "#ffffff",
				pointHighlightFill: "#ffffff",
				pointHighlightStroke: "#ffffff",
	  			// fill: false,
	  			data: []
	  		},
	  		{
  				label: 'Waste Water',
	  			fillColor: "rgba(128, 222, 234, 0.3)",
				strokeColor: "#80deea",
				pointColor: "#00bcd4",
				pointStrokeColor: "#80deea",
				pointHighlightFill: "#80deea",
				pointHighlightStroke: "#80deea",
	  			// fill: false,
	  			data: []
	  		}
  		]
  	},
  	effChartData: {
  		labels: [],
  		datasets:[
  			{
  				label: 'Water',
	  			fillColor: "rgba(128, 222, 234, 0.6)",
				strokeColor: "#ffffff",
				pointColor: "#00bcd4",
				pointStrokeColor: "#ffffff",
				pointHighlightFill: "#ffffff",
				pointHighlightStroke: "#ffffff",
	  			// fill: false,
	  			data: []
	  		},
	  		{
  				label: 'Waste Water',
	  			fillColor: "rgba(128, 222, 234, 0.3)",
				strokeColor: "#80deea",
				pointColor: "#00bcd4",
				pointStrokeColor: "#80deea",
				pointHighlightFill: "#80deea",
				pointHighlightStroke: "#80deea",
	  			// fill: false,
	  			data: []
	  		}
  		]
  	},
  	chartData: undefined,
  	switch: false,
    showModal: false,
    duplicates: [],
    
    selectedUrl: '#',

    // Add Link URL variables here:
    electricalUrl: '',
    pwmorUrl: '',
    pumpsUrl: '',
    metersUrl: '',
    wtp008Url: '',
    wtp014Url: '',
    monthName: '',
    monCompUrl: '',
    roundSheetUrl: '',
    monTotalUrl: '',
    purchWaterUrl: '',
    weeklyUrl: '',
    waterUsageUrl: '',
    yearlyCompUrl: '',
    dailyTotalsUrl: '',
    pumpChangesUrl: '',
    dailyWaterAnalysisUrl: '',
    dailyChlorineResidualUrl: '',
    flowCalcUrl: '',
    finishedWaterUrl: '',
    dailyFilterRecordsUrl: '',
    phCalibrationUrl: '',
    ctUrl: '',
    clarNtuUrl: '',
    colorOdorUrl: '',
    clearwellsUrl: '',
    filterBackwashProfileUrl: '',
    turbCalUrl: '',
    bleachLasUrl: '',
    mangUrl: '',
    filterDataSumUrl: '',
    swmorUrl: '',
    copperUrl: '',
    weeklyCalUrl: '',
    threeYearProductionSummaryURL: '',
    threeYearProductionSummary_CalendarURL: '',
    waterCalcURL: '',
  },
  created: function() {
    var self = this;
    var now = new Date();
    this.date = new Date();
    this.month = this.formatDate(this.date).month;
    this.year = this.formatDate(this.date).year;
    this.day = this.formatDate(this.date).day;
    this.lastWeekDay = this.formatDate(this.date).lastWeekDay;
    this.monthName = months[parseInt(this.month) - 1];
    this.parseUrls();
    this.fetchData();
    
    // Check for updated lake level or dosages
    // setInterval(function() {
    //   console.log("Updating..");

    //   self.fetchData();
    //   // self.checkDuplicates();

    // }, 60000);
  },
  // mounted() {
  // 	materialDatePicker('start_date');
  //   this.onDateChange();
  // },
  methods: {
    fetchData: function() {
      var self = this;

      // Get Dosages data
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'PublicServices/Water/adminCharts',
      }, function(data) {
      	  self.loading = false;
      	  self.data = data[0].slice(2);
      	  self.parseData();

      	  $('body').addClass('loaded');
      });
      
      // Get lake level data
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewLakeLevelByDate',
          Day        : self.day,
          Month      : self.month,
          Year       : self.year,
      }, function(data) {
          self.lakelevel = data[0][0].level;
          // console.log(self.lakelevel);
      });
      
    },
    checkDuplicates: function() {
      var self = this;

      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'PublicServices/Water/waterCheckDuplicateEntries',
      }, function(data) {
          self.duplicates = data[0];

          if (self.duplicates.length > 0) {
            self.showModal = true;
          }
          console.log(self.duplicates);
      });
    },
    checkForm(id) {
      if (id === '36') {
        return 'Rounds Sheet';
      } else if (id === '37') {
        return 'Daily Water Analysis';
      } else {
        return 'Daily Chlorine Residual';
      }
    },
    
    formatDate: function(date) {
      var month = this.date.getMonth() + 1;
      month = month < 10 ? '0' + month : month;

      var day = this.date.getDate();
      day = day < 10 ? '0' + day : day;
      
      // Weekly reports will default to last weeks report.
      var lastWeekDay = new Date(this.date.getTime() - (7 * 24 * 60 * 60 * 1000)).getDate();
      lastWeekDay = lastWeekDay < 10 ? '0' + lastWeekDay : lastWeekDay;

      var year = this.date.getYear() + 1900;
      return {month: month, year: year, day: day, lastWeekDay: lastWeekDay};
    },
    parseData: function() {
    	var self = this;

    	self.data.forEach((day) => {
    		self.infChartData.labels.push(day.reportdate);
    		self.infChartData.datasets[0].data.push(day.w_influent)
    		self.infChartData.datasets[1].data.push(day.ww_influent)
    		self.effChartData.labels.push(day.reportdate);
    		self.effChartData.datasets[0].data.push(day.w_effluent)
    		self.effChartData.datasets[1].data.push(day.ww_effluent)
    	});

    	self.chartData = this.infChartData;
    },
    parseUrls: function() {
      var urlPrefix ="http://apps.cityoflewisville.com/WaterForms/";
      var urlSuffix = "/index.html?Year=" + this.year + "&Month=" + this.month;

      // Add Link URLs here
      this.pwmorUrl = urlPrefix + "PWMOR" + urlSuffix;
      this.pumpsUrl = urlPrefix + "52" + urlSuffix;
      this.metersUrl = urlPrefix + "50" + urlSuffix;
      this.wtp008Url = urlPrefix + "ControlRoomMeterReadings" + urlSuffix;
      this.wtp014Url = urlPrefix + "RawWaterPumpage" + urlSuffix;
      this.monCompUrl = urlPrefix + "MonthlyComposite" + urlSuffix;
      this.electricalUrl = urlPrefix + "54" + urlSuffix;
      this.roundSheetUrl = urlPrefix + "36" + urlSuffix + "&Day=" + this.day;
      this.monTotalUrl = urlPrefix + "MonthlyTotals" + urlSuffix;
      this.purchWaterUrl = urlPrefix + "PurchasedWaterMeters" + urlSuffix;
      this.weeklyUrl = urlPrefix + "WeeklyReport" + urlSuffix + "&Day=" + this.lastWeekDay;
      this.waterUsageUrl = urlPrefix + "WaterUsage" + urlSuffix;
      this.yearlyCompUrl = urlPrefix + "YearlyComposite" + urlSuffix;
      this.dailyTotalsUrl = urlPrefix + "DailyTotals" + urlSuffix + "&Day=" + this.day;
      this.pumpChangesUrl = urlPrefix + "65" + urlSuffix + "&Day=" + this.day;
      this.dailyWaterAnalysisUrl = urlPrefix + "37" + urlSuffix + "&Day=" + this.day;
      this.dailyChlorineResidualUrl = urlPrefix + "48" + urlSuffix + "&Day=" + this.day;
      this.flowCalcUrl = urlPrefix + "38";
      this.finishedWaterUrl = urlPrefix + "64" + urlSuffix + "&Day=" + this.day;
      this.dailyFilterRecordsUrl = urlPrefix + "56" + urlSuffix + "&Day=" + this.day;
      this.phCalibrationUrl = urlPrefix + "68" + urlSuffix;
      this.ctUrl = urlPrefix + "69" + urlSuffix;
      this.clarNtuUrl = urlPrefix + "70" + urlSuffix;
      this.colorOdorUrl = urlPrefix + "71" + urlSuffix;
      this.clearwellsUrl = urlPrefix + "72" + urlSuffix;
      this.filterBackwashProfileUrl = urlPrefix + "73" + urlSuffix;
      this.turbCalUrl = urlPrefix + "74" + urlSuffix;
      this.bleachLasUrl = urlPrefix + "53" + urlSuffix;
      this.mangUrl = urlPrefix + "75" + urlSuffix;
      this.filterDataSumUrl = urlPrefix + "FilterDataSummary" + urlSuffix;
      this.swmorUrl = urlPrefix + "SWMOR" + urlSuffix + "&Day=" + this.day;
      this.copperUrl = urlPrefix + "79" + urlSuffix;
      this.weeklyCalUrl = urlPrefix + "80" + urlSuffix;
      this.threeYearProductionSummaryURL = urlPrefix + "77";
      this.threeYearProductionSummary_CalendarURL = urlPrefix + "ThreeYearCalendarSummary";
      this.waterCalcURL = urlPrefix + "waterCalc";
    },
    switchInfEff: function() {
    	var self = this;
    	console.log("Checked")
    	self.switch = !self.switch;

    	if (self.switch) {
    		self.chartData = self.effChartData;
    	} else {
    		self.chartData = self.infChartData;
    	}
    },
    updateDate: function() {
      this.month = this.dateString.split("-")[1];
      this.monthName = months[parseInt(this.month) - 1];
      this.year = this.dateString.split("-")[2];
      this.day = this.dateString.split("-")[0];
      this.lastWeekDay = this.dateString.split("-")[0];
      this.date = new Date(this.month + '-' + this.day + '-' + this.year);
      this.fetchData();
    },
    updateMonth: function() {
      this.updateDate();
      this.parseUrls();
    },
    
  },
});
