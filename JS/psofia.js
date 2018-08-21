'use strict';

class Psofia {
  // This is a simple library for connecting to the Psofia api for adding/editing
  // form records. Requires jQuery. This isn't fully tested yet.
  
  constructor(formId) {
    this.formId = formId;
    this.blacklistKeys = ['id', 'psofia_createdby', 'psofia_createddate', 'psofia_editedby', 'psofia_editeddate', 'psofia_recordid'];
    this.originalData = [];
    this.data = [];
    this.formattedData = [];
    this.recordId = '123';
  }
  
  setExceptions(listOfKeys) {
    // list of keys needs to be an array of object
    // keys not to be included in the post requests.
    
    var self = this;
    listOfKeys.forEach((key) => {
      self.blacklistKeys.push(key);
      console.log(key);
    });
  }
  
  setData(data, recordId) {
    // Set data for save/update, this is done right before the save/update call
    // and can only be one row at a time.
    
    // *** NOTE ***
    // Problems happen with capitalization of column names I think, 
    // so in the sql server table make sure all column names 
    // are lowercase to begin with. 
    // ************
    
    var key, keys = Object.keys(data);
    var n = keys.length;
    var newobj={}
    while (n--) {
      key = keys[n];
      newobj[key.toLowerCase()] = data[key];
    }
    
    this.data = newobj;
    this.recordId = recordId;
  }
  
  setOriginalData(data) {
    // Set original data from query on load to calculate difference in 
    // the update request. This may be multiple rows, which are each elements in
    // the originalData array.
    var key, keys = Object.keys(data);
    var n = keys.length;
    var newobj={}
    while (n--) {
      key = keys[n];
      newobj[key.toLowerCase()] = data[key];
    }
    
    this.originalData = newobj;
  }
  
  save(updateKeys) {
    var self = this;
    let keys = Object.keys(self.data);
    
    self.formattedData.push({"User": localStorage.colEmail, "Form": self.formId});

    if (updateKeys !== undefined) {
      keys = updateKeys
    } else {
      self.blacklistKeys.forEach((key) => {
        let index = keys.indexOf(key);
        if(keys[index] !== undefined) {
          keys.splice(index, 1);
        }
      });
    }
    
    keys.forEach((key, idx) => {
      self.formattedData.push({ "Id": key, "Value": self.data[key] });
    });
    
    $.post('https://query.cityoflewisville.com/v2/', {
      webservice : 'PSOFIA/AddAPI',
      auth_token: localStorage.colAuthToken,
      data: JSON.stringify(self.formattedData)
    }, function(data) {
      console.log(data);
      self.recordId = data['return'][0].RecordNumber;
    });
    self.formattedData = [];
    return self.recordId;
  }
  
  update(key, value) {
    var self = this;
    // Check if data is an array:
    if ((self.originalData.length > 0 && self.originalData.length === self.data.length)) {
      self.originalData.forEach((row, idx) => {
        self._updateOrSave(row, self.data[idx]);
      });
    // If data is an ordinary object:
    } else if (!Array.isArray(self.originalData) && !Array.isArray(self.data)) {
      self._updateOrSave(self.originalData, self.data);      
    }
    self.originalData = self.data;
    self.data = [];
  }
  
  
  // Private methods:
  
  _formatUpdate(recordId, key, value) {
    var self = this;
    
    return [
      {
        "recordNumber": recordId, 
        "User": localStorage.colEmail, 
        "Form": self.formId, 
        "Id": key, 
        "Value": value, 
      }
    ]
  }
  
  _objectDiff(original, altered) {    
    var self = this;
    var keysToUpdate = [];
    let originalKeys = Object.keys(original);
    let alteredKeys = Object.keys(altered);
    
    // Get rid of any object properties that aren't needed
    self.blacklistKeys.forEach((key) => {
      let index = originalKeys.indexOf(key);
      let alteredIndex = alteredKeys.indexOf(key);
      let kicked;
      if(originalKeys[index] !== undefined) {
        kicked = originalKeys.splice(index, 1);
      }
      if(alteredKeys[alteredIndex] !== undefined) {
        kicked = alteredKeys.splice(alteredIndex, 1);
      }
      console.log(kicked)
    });
    
    // collect any keys that are different/new.
    if (originalKeys.length === alteredKeys.length) {
      originalKeys.forEach((key, idx) => {
       
        if (altered[key] !== original[key]) {
          keysToUpdate.push(key);
        }
        self.formattedData.push({ "Id": key, "Value": altered[key] });
      });
    } else if (originalKeys.length > alteredKeys.length) {
      originalKeys.forEach((key, idx) => {
        
        if (!alteredKeys.includes(key)) {
          keysToUpdate.push(key);
        } else if (altered[key] !== original[key]) {
          keysToUpdate.push(key);
        }
        
        self.formattedData.push({ "Id": key, "Value": self.data[key] });
      });
    } else if (originalKeys.length < alteredKeys.length) {
      alteredKeys.forEach((key, idx) => {
        
        if (!originalKeys.includes(key)) {
          keysToUpdate.push(key);
        } else if (altered[key] !== original[key]) {
          keysToUpdate.push(key);
        }
        
        self.formattedData.push({ "Id": key, "Value": self.data[key] });
      });
    }

    var uniqArr = Array.from(new Set(keysToUpdate));
    console.log(uniqArr)
    return uniqArr;
  }
  
  _updateOrSave(original, altered) {
    var self = this;
    // check differences
        var keysToUpdate = self._objectDiff(original, altered);
         
        var dataRecordId = (altered.psofia_recordid != undefined) ? altered.psofia_recordid : altered.PSOFIA_RecordNumber;
        var originalRecordId = (original.psofia_recordid != undefined) ? original.psofia_recordid : original.PSOFIA_RecordNumber;
        console.log(dataRecordId);
        console.log(originalRecordId);
        
        if (dataRecordId === originalRecordId) {
          self.recordId = dataRecordId;
          if (self.recordId == undefined) {
            self.save(keysToUpdate);
          } else {
            if (keysToUpdate.length > 0) {
              keysToUpdate.forEach((key, idx) => {
                console.log(JSON.stringify(self._formatUpdate(self.recordId, key, self.data[key])))
                $.post('https://query.cityoflewisville.com/v2/', {
                  webservice : 'PSOFIA/UpdateAPI',
                  auth_token: localStorage.colAuthToken,
                  data: JSON.stringify(self._formatUpdate(self.recordId, key, self.data[key]))
                }, function(data) {
                  console.log(data);
                });
              });
            } else {
              console.log("Nothing to update")
            }
          }
        } else {
          console.log("record IDs do not match");
        }
  }
}