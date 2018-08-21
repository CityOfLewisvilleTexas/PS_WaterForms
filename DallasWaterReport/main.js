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
    data: [],
    previousMonth: [],
    date: '',
    month: '',
    sMonth: '',
    eMonth: '',
    sYear: '',
    eYear: '',
    monthParam: '',
    yearParam: '',
    startDate: '',
    endDate: '',
    dynamicYears: [],
  },
  created: function() {
    this.loading = true;
    this.monthParam = $.QueryString["Month"];
    this.yearParam = $.QueryString["Year"];
    this.fetchData();
    this.createYears();
  },
  methods: {
    fetchData: function() {
      var self = this;
      // New v2 request format, don't use citydata anymore
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewFormSubmissionsByMonth',
          Year       : self.yearParam,
          Month      : self.monthParam,
          FormNumber : '50'

      }, function(data) {
        self.loading = false;
        //var date   = new Date(data[0][2].day); // timezone is an issue when creating a new date object. the third record should be the correct month.
        //self.month = months[date.getMonth()];
        self.data  = data[0].slice(1);
        self.previousMonth = data[0][0];
        console.log(self.data);
        console.log(self.previousMonth);
      });
    },
    createYears: function(){
			for (var i = 0; i < 3; i++)
			{
				this.dynamicYears[i] = new Date().getFullYear()-i;
			}
		},
  }
})


// Need to be able to get a date range, and interpolate the meter readings for esps, ssps, esbs. 
// Then configure the report using inputs, and insert into the database, then email the report to Karen and Keith? 
// I don't think this absolutely needs to be a word doc, but it should print well and have the ability to edit maybe? <- are memos immutable?


