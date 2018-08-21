function pad(int) {
  return int < 10 ? '0' + int : int;
}

setInterval(function() {
  console.log("Updating timestamp");
  var dateToCheck = new Date(app.dateString);
  var currentTime = new Date();
  //console.log(dateToCheck);
  //console.log(currentTime);
  if (currentTime.getDate() > dateToCheck.getDate() && !app.editing && currentTime.getHours() < 1) {
    console.log("new day");
    //console.log(currentTime.getDate())
    //console.log(dateToCheck.getDate())
    if (currentTime.getYear() > dateToCheck.getYear()) {
      app.yearParam = pad(parseInt(app.yearParam) + 1);
      app.monthParam = pad(parseInt(app.monthParam) + 1);
      app.dayParam = '01';
    } else if (currentTime.getMonth() > dateToCheck.getMonth()) {
      app.monthParam = pad(parseInt(app.monthParam) + 1);
      app.dayParam = '01';
    } else {
      app.dayParam = pad(parseInt(app.dayParam) + 1)
    }
    //console.log(self.yearParam)
    //console.log(self.monthParam)
    //console.log(self.dayParam)
    app.dateString = app.monthParam + "/" + app.dayParam + "/" + app.yearParam;
    
    app.today = new Date();
  }
  app.fetchData();
}, 60000);