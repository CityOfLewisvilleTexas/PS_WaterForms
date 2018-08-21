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
    date: '',
    dateString: '',
    month: '',
    monthYear: '',
    year: '',
    selected: '37',
    options: [
      { text: 'Rounds Sheet', value: '36' },
      { text: 'Daily Water Analysis', value: '37' },
      { text: 'Flow Calculator', value: '38' },
      { text: 'Daily Chlorine Residual Report', value: '48' },
      { text: 'Fluoride', value: '49' },
      { text: 'Meter Reading Worksheet', value: '50' },
    ],
  },
  created: function() {
    this.date = new Date();
    this.month = this.formatDate(this.date).month - 1;
    this.year = this.formatDate(this.date).year;

    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;

      // New v2 request format, don't use citydata anymore
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewFormSubmissionsByMonth',
          Year : self.year,
          Month : self.month,
          FormNumber : self.selected,
      }, function(data) {
          // var date = new Date(data[0][2].day); // timezone is an issue when creating a new date object. the third record should be the correct month.
          // self.month = months[date.getMonth()];
          self.data = data[0].slice(1);
          self.previousMonth = data[0][0];
      });
    },
    search: function() {
      this.month = this.dateString.split("-")[0];
      this.monthName = months[parseInt(this.month) - 1];
      this.year = this.dateString.split("-")[1];
      this.date = new Date(this.month + "-01-" + this.year);
      this.selected = this.selected;

      this.fetchData();
    },
    formatDate: function(date) {
      var month = this.date.getMonth() + 2;

      month = month < 10 ? '0' + month : month;
      var year = this.date.getYear() + 1900;
      return {month: month, year: year};
    }
  }
})
