function BoxeeRemote(ip, port) {
    this.ip = ip;
    this.port = port || "8800";
    this.url = 'http://'+this.ip+':'+this.port+'/xbmcCmds/xbmcHttp?command=';
	var that = this;

    try {
//        this.xhr = new _SSXHR();
        this.xhr = new XMLHttpRequest();
    } catch (err) {
        console.log('error '+err+' while trying to create XHR object');
        return
    }

	this.defaultCallback = function(data) {
		console.log(data);
		return;
	}

	this.callback = function(data) {
		return;
	}

    this.xhr.onload = function(e) {
		that.callback(that.createJson(this.responseText));
		that.callback = that.defaultCallback;	
    }

    
    this.xhr.onreadystatechange = function () {
        console.log('state = '+this.readyState);
        if (this.readyState == 4) {
            console.log('status = '+this.status);
        }
    }
}

BoxeeRemote.prototype.createJson = function(htmltext) {
	// Boxee returns bad HTML - convert to JSON
	var data = htmltext.split('\n');
	var output = {}
	for (var i=0; i < data.length; i++) {
		var line = data[i].split(';');
		if (line.length == 2) {
			output[line[0].replace('<li>','')] = line[1];
		} else {
			var line = data[i].split(':');
			if (line.length > 1) {
				output[line[0].replace('<li>','')] = line.slice(1).join(':').replace('</html>','');
			}
		}
	}
	console.log(output);
	return JSON.stringify(output);
}

BoxeeRemote.prototype.send = function(command, parameters) {
    var command = command || "";
    var parameters = parameters || "";
    if (parameters != "") {
        console.log('send '+this.url+command+"("+parameters+")");
        url = this.url+command+"("+parameters+")";
    } else {
        console.log('send '+this.url+command);
        url = this.url+command
    }
    console.log('loading '+url);
    this.xhr.open("GET", url, true);
    this.xhr.send();
}

BoxeeRemote.prototype.sendAndReceive = function(command, parameters, callback) {
	if (typeof(callback) == "undefined") {
		var callback = parameters;
		var parameters = false;
	} else {
		var callback = callback;
		var parameters = parameters;
	}
	this.callback = callback;
	if (parameters) {
		this.send(command, parameters);
	} else {
		this.send(command);
	}
}

BoxeeRemote.prototype.up = function () {
    this.send("SendKey", "270");
}

BoxeeRemote.prototype.down = function () {
    this.send("SendKey", "271");
}

BoxeeRemote.prototype.left = function () {
    this.send("SendKey", "272");
}

BoxeeRemote.prototype.right = function () {
    this.send("SendKey", "273");
}

BoxeeRemote.prototype.back = function () {
    this.send("SendKey", "275");
}

BoxeeRemote.prototype.select = function () {
    this.send("SendKey", "256");
}

BoxeeRemote.prototype.sendChar = function(myChar) {
    this.send("SendKey", ""+(parseInt(myChar) + 61696));
}

BoxeeRemote.prototype.sendKeyPress = function(event) {
    this.sendChar(event.keyCode);
}

BoxeeRemote.prototype.sendString = function(text) {
    for (var i=0; i < text.length; i++) {
        this.sendChar(text.charCodeAt(i));
    }
}

BoxeeRemote.prototype.getShares = function(shareType) {
	if (shareType in {'music':0, 'video':0, 'pictures':0}) {
		this.sendAndReceive("GetShares", shareType, function(json) {
			console.log(json)
		});
	} else {
		console.log('Invalid share type');
		return false;
	}
}

BoxeeRemote.prototype.getCurrentlyPlaying = function(callback) {
	var callback = callback;
	this.sendAndReceive("GetCurrentlyPlaying", function(json) {
		callback(json);
	});
}

BoxeeRemote.prototype.jumpTo = function(percentage) {
	// ::TODO:: allow for time jumping too
	this.send("seekPercentage", percentage);
}

BoxeeRemote.prototype.isPlaying = function(filename, callback) {
	var filename = filename;
	var callback = callback;
	this.sendAndReceive("GetCurrentlyPlaying", function(json) {
		var data = JSON.parse(json);
		console.log(data);
		if ("Filename" in data) {
			if (data['Filename'] == filename) {	
				callback(true);
			} else {
				callback(false);
			}
		} else {
			callback(false);
		}
	});
}

BoxeeRemote.prototype.loadBookmark = function(filename, type, percentage) {
	var percentage = percentage || false;
	var filename = filename;
	var that = this;
	if (type.toLowerCase() in {'music':"", "video": ""}) {
		if (percentage) {
			this.sendAndReceive("PlayFile", filename, function(json) {
				console.log('filename is currently '+filename);
				var loadstatus = false;
				var timer = function() {
					if (!loadstatus) {
						console.log('checking if '+filename+' is playing');
						that.isPlaying(filename, function(loadstatus) {
							console.log('status is '+loadstatus);
							if (loadstatus) {
								that.jumpTo(percentage);
							} else {
								setTimeout(timer, 500);
							}
						});
					}
				};
				setTimeout(timer, 500);	
			});
		} else {
			this.send("PlayFile", filename);
		}
	} else {
		this.send("ShowPicture", filename);
	}
}

BoxeeRemote.prototype.storeBookmark = function(position) {
	var position = position || false;
	this.getCurrentlyPlaying(function (json) {
		var data = JSON.parse(json);
		store.get('bookmarks', function(dbjson) {
			if (dbjson) {
				var dbdata = JSON.parse(dbjson);
			} else {
				var dbdata = [];
			}
			if ('Filename' in data) {
				var new_bookmark = {}
				if (data['Filename'] != '[Nothing Playing]') {
					new_bookmark['filename'] = data['Filename'];
					new_bookmark['type'] = data['Type'];
					if (position) {
						new_bookmark['position'] = data['Percentage'];
					} else {
						new_bookmark['position'] = '0';
					}
					dbdata.push(new_bookmark);
					store.set('bookmarks', JSON.stringify(dbdata));
				}
			}
		});
	});
}

BoxeeRemote.prototype.deleteBookmark = function(filename) {
	var filename = filename;
	store.get('bookmarks', function(jsonData) {
		if (jsonData) {	
			var data = JSON.parse(jsonData);
			var deleteIndex = false;
			for (var i=0; i < data.length; i++) {
				if (data[i]['filename'] == filename) {
					deleteIndex = i;
				}
			}
			if (deleteIndex) {
				data = data.splice(deleteIndex, 1);
				store.set('bookmarks', JSON.stringify(data));
			}
		}
	});
};

BoxeeRemote.prototype.listBookmarks = function(callback) {
	var callback = callback;
	store.get('bookmarks', function(data) {
		if (!data) {
			output = "None";
		} else {
			var dbdata = JSON.parse(data);
		}
		callback(dbdata);
	});
}

var store = Lawnchair(function() {});
