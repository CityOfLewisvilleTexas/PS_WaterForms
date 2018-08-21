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
    formId: '72',
    month: '',
    day: '',
    year: '',
    date: '',
    today: moment(),
    data: [],
    loading: false,
  },
  created: function() {
    this.loading = true;
    this.record = $.QueryString["Record"];
    this.yearParam = $.QueryString["Year"];
    this.monthParam = $.QueryString["Month"];
    this.dayParam = $.QueryString["Day"];
    this.date = moment().format(this.monthParam + '/01/' + this.yearParam, 'MM/DD/YYYY')
    this.loading = true;
    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;
      // New v2 request format, don't use citydata anymore
      $.post('https://query.cityoflewisville.com/v2/', {
        webservice : 'Public Services/Water/viewFormSubmissionsByMonth',
        Year       : self.yearParam,
        Month      : self.monthParam,
        //Day        : self.dayParam,
        FormNumber : self.formId,
      }, function(data) {
        self.loading = false;
        self.data = data[0].slice(1);
        //self.date = moment().format(data[0][1].day).get('month');
        console.log( moment.utc(data[0][1].day))
        self.month = moment.utc(data[0][1].day).get('month') + 1;
        console.log(parseInt(self.month));
        self.year = moment.utc(data[0][1].day).get('year');
        
        self.data.forEach((day) => {
          day.day = moment.utc(day.day);
           console.log(day.day)
        });
        
        console.log(self.data);
        self.loading = false;
      });
    },
    total: function(index, keyPart) {
      let self = this;
      let free = parseFloat(self.data[index][keyPart + "_free"]) || 0;
      let mono = parseFloat(self.data[index][keyPart + "_mono"]) || 0;
      let di = parseFloat(self.data[index][keyPart + "_di"]) || 0;
      
      return (free + mono + di).toFixed(1);
    },
  }
})
