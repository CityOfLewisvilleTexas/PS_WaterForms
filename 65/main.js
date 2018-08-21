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
    dayParam: '',
    monthParam: '',
    yearParam: '',
    date: '',
    data: [],
    loading: false,
  },
  created: function() {
    this.loading = true;
    this.dayParam = $.QueryString["Day"];
    this.monthParam = $.QueryString["Month"];
    this.yearParam = $.QueryString["Year"];
    this.date = this.dayParam + "/" + this.monthParam + "/" + this.yearParam;
    this.loading = true;
    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;
      // New v2 request format, don't use citydata anymore
      $.post('https://query.cityoflewisville.com/v2/', {
        webservice : 'Public Services/Water/viewDailyWaterPumpChanges',
        year       : self.yearParam,
        month      : self.monthParam,
        day        : self.dayParam,
      }, function(data) {
        self.loading = false;
        self.data = data[0];
        console.log(self.data);
        self.loading = false;
      });
    },
  }
})
