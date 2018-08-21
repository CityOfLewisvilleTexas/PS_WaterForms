
$('input[type="month"]').dblclick(function() {
	var now = new Date();

	var month = ("0" + (now.getMonth() + 1)).slice(-2);
	var today = now.getFullYear()+"-"+(month) ;

  console.log(today);
	$(this).val(today);;
});
