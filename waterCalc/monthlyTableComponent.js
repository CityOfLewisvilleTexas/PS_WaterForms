Vue.component('monthly-table', {
  
  props: {
    month: {
        type: Object
    },
    previousmonth: {
        type: Object
    },
    ytdtotals: {
        type: Object
    },
  },

  template: '#monthly-table-template',

  mounted: function () {
    console.log(this.month)
    console.log(this.previousmonth)
  },
  methods: {
  	daysInMonth: function(month,year) {
      return (new Date(year, month, 0)).getDate();
    },
    total: function(...args) {
      let total = args.reduce( (total, arg) => parseInt(total) + parseInt(arg) );
      return total;
    },
    totalFloat: function (...args) {
      let total = args.reduce( (total, arg) => parseFloat(total) + parseFloat(arg) );
      return total;
    },
    diff: function(first, second, float=false) {
      if (float) {
        return (parseFloat(first) - parseFloat(second));
      } else {
        return (parseInt(first) - parseInt(second));
      }
      
    },
    localizeInt: function(input) {
      var value = parseInt(input);
      
      if (isNaN(value)) {
        return ''
      } else {
        return value.toLocaleString()
      }
    },
    localizeFloat: function(input, decimal) {
      let value = parseFloat(input);
      
      if (isNaN(value)) {
        return ''
      } else {
        // console.log(value)
        return value.toFixed(decimal)
      }
    },
    average: function(key) {
      var self = this;
      var average = 0;
      var count = 0;
      self.data.forEach(function(month) {
        var value = parseFloat(month[key]);
        if (!isNaN(value)) {
            average += value;
            count += 1
        }
      });
      average = (average / count).toLocaleString();	// changed to 3 decimal places
      if(isNaN(average)) {
        return "";
      } else {
        return average;
      }
    },
  }
});