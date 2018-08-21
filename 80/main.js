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
    loading: false, // for loading spinners
    record: '',
    year: '',
    month: '',
    currentTab: '0',
    data: [],
  },
  created: function() {
    this.loading = true;
    this.record = $.QueryString["Record"];
    this.month = $.QueryString["Month"];
    this.year = $.QueryString["Year"];
    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;
      // New v2 request format, don't use citydata anymore
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'PublicServices/Water/weeklyCalibration', // Webservice name here
          // Put webservice parameters here:
        month: self.month,
        year: self.year
      }, function(data) {
        self.loading = false;
        self.data = data[0];
        
        self.data.forEach((day) => {
          day.day = moment.utc(day.day);
          day.weekStart = moment.utc(day.weekStart);
          day.weekEnd = moment.utc(day.weekEnd);
           console.log(day.day)
        });
        
        console.log(self.data);
      });
    },
    changeTab: function(tabName) {
      this.currentTab = tabName;
    },
  }
})
