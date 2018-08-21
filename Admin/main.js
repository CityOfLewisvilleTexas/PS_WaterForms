
var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

Vue.component('modal', {
  template: '#modal-template'
})

// Main App
var app = new Vue({
  el: '#app',
  data: {
    day: '',
    month: '',
    year: '',
    date: '',
    dateString: '',
    lastWeekDay: '',
    data: [],
    lakelevel: '--',

    showModal: false,
    duplicates: [],
    
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
    setInterval(function() {
      console.log("Updating..");

      self.fetchData();
      self.checkDuplicates();

    }, 60000);
  },
  methods: {
    fetchData: function() {
      var self = this;

      // Get Dosages data
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewWaterDosagesDashboard',
      }, function(data) {
          self.data = data[0][0];
          console.log(self.data);
      });
      
      // Get lake level data
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewLakeLevelByDate',
          Day        : self.day,
          Month      : self.month,
          Year       : self.year,
      }, function(data) {
          self.lakelevel = data[0][0].level;
          console.log(self.lakelevel);
      });
      
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
    }
  },
});
