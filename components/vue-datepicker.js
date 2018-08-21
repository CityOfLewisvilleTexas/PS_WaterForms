Vue.component('datepicker', {
template: '\
  <input class="form-control datepicker"\
        ref="input"\
        v-bind:value="value"\
        v-on:input="updateValue($event.target.value)"\
        data-date-format="dd-mm-yyyy"\
        placeholder="dd-mm-yyyy"\
       type="text"  />\
', // data-date-end-date="0d"\
props: {
  value: {
    type: String,
    default: moment().format('DD-MM-YYYY')
  },
  depth: {
    type: String,
    default: "months"
  },
  start: {
    type: String,
    default: "years"
  }
},
mounted: function() {
    let self = this;
    this.$nextTick(function() {
        $(this.$el).datepicker({
            startView: 0,  // works for only selecting years or months
            minViewMode: self.depth,
            todayHighlight: true,
            todayBtn: "linked",
            autoclose: true,
            format: "dd-mm-yyyy"
        })
        .on('changeDate', function(e) {
            var date = e.format('dd-mm-yyyy');
            self.updateValue(date);
        });
    });
},
methods: {
    updateValue: function (value) {
        this.$emit('input', value);

    },
}
});
