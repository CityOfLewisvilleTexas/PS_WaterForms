Vue.component('monthly-table', {
  
  props: {
    month: {
        type: Object
    },
    // previousmonth: {
    //     type: Object
    // },
    // ytdtotals: {
    //     type: Object
    // },
  },

  template: '#monthly-table-template',

  mounted: function () {
    // console.log(this.month)
    // console.log(this.previousmonth)
  },
  methods: {
  	
  }
});