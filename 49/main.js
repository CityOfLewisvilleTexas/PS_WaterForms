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


// Main App
var app = new Vue({
  el: '#app',
  data: {
    record: '', // TESTING: 'f2cbc9cfbfbe4ffd8484cbd1c5347232'
    data: [],
    date: '',
    loading: false,
  },
  created: function() {
    this.record = $.QueryString["record"];
    this.loading = true;
    this.fetchData();
  },
  methods: {
    fetchData: function() {
      var self = this;

      // New v2 request format, don't use citydata anymore
      $.post('https://query.cityoflewisville.com/v2/', {
          webservice : 'Public Services/Water/viewFluoride',
          record : self.record,
      }, function(data) {
        self.date = data[0][0].rDateFormatted;
        self.data = data[0][0];
        console.log(data[0][0]);
        self.loading = false;
      });
    },
    average: function() {
      var self = this;

      var raw_lab = parseFloat(self.data.raw_fluoride) || 0;
      var fin_lab = parseFloat(self.data.fin_fluoride) || 0;
      var raw_plant = parseFloat(self.data.raw_fluoride_plant) || 0;
      var fin_plant = parseFloat(self.data.fin_fluoride_plant) || 0;

      var raw = (raw_lab + raw_plant) / 2;
      var finished = (fin_lab + fin_plant) / 2;
      return {raw: raw, finished: finished}
    }
  }
})
