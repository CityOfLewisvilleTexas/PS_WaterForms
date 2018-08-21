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
    yearParam: '',
    monthParam: '',
    dayParam: '',
    month: '',
    day: '',
    year: '',
    date: '',
    data: [],
    loading: false,
  },
  created: function() {
    this.loading = true;
    this.record = $.QueryString["Record"];
    this.yearParam = $.QueryString["Year"];
    this.monthParam = $.QueryString["Month"];
    this.dayParam = $.QueryString["Day"];
    this.date = moment().format(this.monthParam + '/01/' + this.yearParam, 'MM/DD/YYYY');
    this.loading = true;
    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;
      // New v2 request format, don't use citydata anymore
      $.post('https://query.cityoflewisville.com/v2/', {
        webservice : 'Public Services/Water/viewFilterBackwashProfileByMonth',
        Year       : self.yearParam,
        Month      : self.monthParam,

      }, function(data) {
        self.loading = false;
        self.data = data[0].slice(1);
        
        self.data.forEach((day) => {
          day.day = moment.utc(day._date);
        });
        
        console.log(self.data);
        self.loading = false;
      });
    },
  }
})
