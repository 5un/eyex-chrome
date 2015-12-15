(function(exports) {

	/**
	 * Message Structure
	 * {
	 * 	type: "request" | "response" | "event",
	 *	requestId:"",
	 *	resource: "tracker" | "calibration",
	 *	path: "",
	 *	parameters: {
	 *		param1: "",
	 *		param2: ""
	 *	},
	 *	data: {
	 *		"The return data"
	 *	}
	 * }
	 */

	var TYPE = {
		REQUEST: 'request',
		RESPONSE: 'response',
		EVENT: 'event'
	};

 	var RESOURCE = {
    	TRACKER: 'tracker',
    	CALIBRATION: 'calibration'
  	};

	var BLINK_PHASE = {
		NOT_STARTED:0 ,
		BEFORE_EYES_CLOSED:1 ,
		EYES_CLOSED: 2,
		AFTER_EYES_CLOSED:3
	};

	var defaultTrackerInfo = {
		push: false,
		version: 1,
		trackerstate: undefined,
		framerate: 30,
		iscalibrated: false,
		iscalibrating: false,
		calibresult: undefined,
		frame: undefined,
		screenindex: 0,
		screenresw: 1024,
		screenresh: 768,
		screenpsyw: 1,
		screenpsyh: 1
	};

	var defaults = {
		host: '127.0.0.1',
		port: 6555,
		smoothingFactor: 0.9,
		smoothStatusDelay: 100,  // 100 ms
		blinkEyesClosePeriod: 1000,
		blinkEyesOpenPeriod: 50,
		blinkEyesCloseErrorTolerance: 500,
		nativeScreenWidth: 1920,
		nativeScreenHeight: 1280,
		nativeScreenX: 0,
		nativeScreenY: 0

	};

	var tcpClient;

	function TobiiEyeX(options){
		this.latestRequestId = 1;
		this.options = defaults;
		this.trackerInfo = defaultTrackerInfo;
		this.callback = {};
		this.apiCallback = {};
		this.frame = {
			smoothXY: {x: 0, y: 0},
			deltaTime: 0,
			lastFrameTime: new Date(),
			smoothStatus: {
				gazing: {value: false, counter:0},
				eyes:  {value: false, counter:0},
				presence:  {value: false, counter:0},
				fail:  {value: false, counter:0},
				lost:  {value: false, counter:0}
			},
			status:{
				presence: false
			},
			lefteye: {
				pcenter: {x: 0, y:0}
			},
			righteye: {
				pcenter: {x:0, y:0}
			},
			blinkCounter: 0,
			blinkPhase: BLINK_PHASE.NOT_STARTED
		};

		this._onAPIMessageReceived = this._onAPIMessageReceived.bind(this);
		this.callback.onFrameCallback = options.onFrameCallback;
		this.callback.onBlinkCallback = options.onBlinkCallback;

		tcpClient = new exports.TcpClient(this.options.host, this.options.port);
		tcpClient.addResponseListener(this._onAPIMessageReceived);

		tcpClient.connect(function(e){
			console.log('EyeTribe Connected');
			// Get the basic info
			this.getTrackerInfo((function(trackerInfo){
				console.log(trackerInfo);
				if(trackerInfo != undefined){
					if(trackerInfo.screen_bounds != undefined){
						this.options.nativeScreenX = trackerInfo.screen_bounds.x;
						this.options.nativeScreenY = trackerInfo.screen_bounds.y;
						this.options.nativeScreenWidth = trackerInfo.screen_bounds.width;
						this.options.nativeScreenHeight = trackerInfo.screen_bounds.height;
					}
				}
			}).bind(this));

		}.bind(this));

	}

	// Internals
	TobiiEyeX.prototype._onAPIMessageReceived = function(message){

		/*
		var splitted = response.split("\n");
		if(splitted.length > 1){
			//console.log("split");
			for(var i in splitted){
				if(splitted[i].length > 1){
					//console.log(splitted[i]);
					this._onAPIResponse(splitted[i]);
				}
			}
			return;
		}
		*/

		/*
		var k = response.indexOf("}\n{");
		if(k != -1){
			console.log('split');
			var r1 = response.substring(0, k+2);
			var r2 = response.substring(k + 2, response.length - 1);
			this._onAPIResponse(r1);
			this._onAPIResponse(r2);
			return;
		}
		*/
		try{
			message = JSON.parse(message);

			if(message.type === 'response'){
				if(message.requestId != undefined){
					var cb = this.apiCallback[message.requestId];
					if(typeof cb === 'function'){
						cb(message.data);
					}
				}
			}else if(message.type === 'request'){
				// Not supported yet
			}else if(message.type === 'event') {
				if(message.event_type === 'frame'){
					this._processFrame(message.data);
					this.callback.onFrameCallback(this.frame);
				}
			}

		}catch(e){
			console.log(e);
		}
	};

	TobiiEyeX.prototype._sendAPIMessage = function(type, resource, path, parameters, callback){
	    var msg = {
	    	"type": type,
	    	"resource": resource,
	    	"path": path
	    };

	    if(type == 'request'){
	    	var reqId = this.latestRequestId++;
	    	msg.requestId = reqId;
	    	this.apiCallback[reqId] = callback;
	    }

	    if(parameters != undefined){
	    	msg.parameters = parameters;
	    }
	    
    	tcpClient.sendMessage(JSON.stringify(msg));
  	};

  	TobiiEyeX.prototype.getTrackerInfo = function(callback){
	    this._sendAPIMessage(TYPE.REQUEST, RESOURCE.TRACKER , 'get.basic_info', undefined, callback);
  	};

  	// Calibration Methods
  	TobiiEyeX.prototype.requestCalibration = function(callback){
  		// TODO use this calibrate
  		this._sendAPIMessage(TYPE.REQUEST, RESOURCE.CALIBRATION, 'start', undefined, callback);
  	};

  	// Frame Processing

  	TobiiEyeX.prototype._processFrame = function(frame){
  		
  	/*
  	frame.status = {};
  	frame.status.gazing = true;
		frame.status.eyes = true;
		frame.status.presence = true;
		frame.status.fail = false;
		frame.status.lost = false;
		*/
		
		this.frame.status.presence = frame.userPresence;
		this.frame.deltaTime = (new Date()) - this.frame.lastFrameTime;
		this.frame.lastFrameTime = new Date();

		this.frame.nativeScreenWidth = this.options.nativeScreenWidth;
		this.frame.nativeScreenHeight = this.options.nativeScreenHeight;
		//TODO
		this.frame.lefteye.pcenter.x = 1.0 - frame.eyePosition.leftNormalized.x;
		this.frame.lefteye.pcenter.y = frame.eyePosition.leftNormalized.y;
		this.frame.righteye.pcenter.x = 1.0 - frame.eyePosition.rightNormalized.x;
		this.frame.righteye.pcenter.y = frame.eyePosition.rightNormalized.y;

		/*
		this.frame.smoothXY = {
			x: frame.gaze.x,
			y: frame.gaze.y
		};
		*/
		// Smooth XY
		
		//console.log(this.options);
		frame.gaze.x = (frame.gaze.x - this.options.nativeScreenX) 
		frame.gaze.y = (frame.gaze.y - this.options.nativeScreenY)


		var dx = Math.abs(this.frame.smoothXY.x - frame.gaze.x);
		var dy = Math.abs(this.frame.smoothXY.y - frame.gaze.y);
		var mag = Math.sqrt(dx*dx + dy*dy);

		//if(frame.status.gazing){
	  		this.frame.smoothXY.x = (this.frame.smoothXY.x * (this.options.smoothingFactor)) + (frame.gaze.x * (1 - this.options.smoothingFactor));
	  		this.frame.smoothXY.y = (this.frame.smoothXY.y * (this.options.smoothingFactor)) + (frame.gaze.y * (1 - this.options.smoothingFactor));
		//}

  	};

 	exports.TobiiEyeX = TobiiEyeX;

})(window);