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
    formId: '71',
    month: 'MM',
    day: 'DD',
    year: 'YY',
    today: moment(),
    data: [],
    consolidatedData: [],
    editUrl: 'http://eservices.cityoflewisville.com/psofia/default.aspx?form=71&record=',
    newUrl: 'http://eservices.cityoflewisville.com/psofia/default.aspx?form=71',
  },
  created: function() {
    this.loading = true;
    this.record = $.QueryString["Record"];
    this.yearParam = $.QueryString["Year"];
    this.monthParam = $.QueryString["Month"];
    this.dayParam = $.QueryString["Day"];
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
        self.data = [];
        self.consolidatedData = [];
        self.loading = false;
		var extraDate = data[0][0]._Date
        //self.data = data[0].slice(1);
		self.data = data[0].filter(function(d){return d._Date != extraDate;});
//        self.year = new Date(data[0][2].day)
//        console.log(self.year)
//        self.month = self.year.getMonth();
//        self.year = self.year.getYear() + 1900;
        
		
		
        //console.log( moment.utc(data[0][1].day))
        //self.month = moment.utc(data[0][1].day).get('month');
		self.month = moment.utc(self.data[0].day).get('month');
        //console.log(parseInt(self.month));
        //self.year = moment.utc(data[0][1].day).get('year');
        self.year = moment.utc(self.data[0].day).get('year');
        
        let lastDay = 0;
        
        self.data.forEach((day, idx) => {
          //self.consolidatedData[idx].push([]);
//          day.day = day.day.slice(0,10) + 'T05:00:00.000Z';
//          day.day = new Date(day.day);
//          lastDay = day.day.getDate();
            day.day = moment.utc(day.day);
            lastDay = day.day.get('date');
        });
		
        
        for (var i = 0; i < lastDay; i++) {
          self.consolidatedData.push([{raw_color: '--', raw_odor: '--', ct_color: '--', ct_odor: '--', PSOFIA_RecordNumber: '--'},{raw_color: '--', raw_odor: '--', ct_color: '--', ct_odor: '--', PSOFIA_RecordNumber: '--'},{raw_color: '--', raw_odor: '--', ct_color: '--', ct_odor: '--', PSOFIA_RecordNumber: '--'}]);
        }
        
        self.consolidatedData.forEach((dayArr, idx) => {
          let date = moment(self.month + "-" + (idx + 1) +self.year, 'MM-DD-YYYY')
          dayArr.forEach((shift, idx) => {
            shift.day = date;
          });
        });
        
        self.data.forEach((day, idx) => {
          let i = day.day.get('date');
          if (day._Time != undefined && day._Time) {
            let timeStr = day._Time.split(':')[0] + day._Time.split(':')[1]
            let time = parseInt(timeStr);
            console.log(time)
            if (time > 2200 || time <= 700) {  // A shift
              self.consolidatedData[i - 1][0] = day;
            } else if (time > 700 && time <= 1500) {
              self.consolidatedData[i - 1][1] = day;
            } else if (time > 1500 && time <= 2200) {
              self.consolidatedData[i - 1][2] = day;
            }
          }
          
        });
        
        console.log(self.data);
        console.log(self.consolidatedData);
        
      });
    },
    getCorrectUrl: function(day) {
      let url = '';
      let self = this;
      if (day.PSOFIA_RecordNumber !== '--') {
        url = self.editUrl + day.PSOFIA_RecordNumber;
      } else {
        url = self.newUrl;
      }
      return url
    },
    newForm: function() {
        window.open('http://apps.cityoflewisville.com/psofia/default.aspx?form=71', '_blank');
    },
    parseWithSlash(color, odor) {
      let returnStr = '';
      
      color = parseInt(color);
      odor = parseInt(odor);
      
      if (isNaN(color)) {
        if (isNaN(odor)) {
          returnStr = '';
        } else {
          returnStr = '--/' + odor;
        }
      } else {
        if (isNaN(odor)) {
          returnStr = color + '/--';
        } else {
          returnStr = color + '/' + odor;
        }
      }
      return returnStr
    },
  }
})
