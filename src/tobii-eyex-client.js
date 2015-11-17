(function(exports) {

 	var CATEGORY = {
    	TRACKER: 'tracker',
    	CALIBRATION: 'calibration',
    	HEARTBEAT: 'heartbeat'
  	};

 	var REQUEST = {
	    GET: 'get',
	    SET: 'set',
	    START: 'start',
	    POINT_START: 'pointstart',
	    POINT_END: 'pointend',
	    ABORT: 'abort',
	    CLEAR: 'clear'
 	};

 	var TRACKER_API_STATUS = {
		NOT_STARTED: 0,
		SENT_START_MESSAGE: 1,
		STARTED: 2
	};

	var BLINK_PHASE = {
		NOT_STARTED:0 ,
		BEFORE_EYES_CLOSED:1 ,
		EYES_CLOSED: 2,
		AFTER_EYES_CLOSED:3
	};

	var defaultTrackerInfo = {
		push: false,
		heartbeatinterval: 3000,
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
		senzeScreenWidth: 1280,
		senzeScreenHeight: 852

	};

	var tcpClient;

	function TobiiEyeX(options){

		this.options = defaults;
		this.trackerInfo = defaultTrackerInfo;
		this.callback = {};
		this.trackerAPIStatus = TRACKER_API_STATUS.NOT_STARTED;
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

		this._onAPIResponse = this._onAPIResponse.bind(this);
		this.callback.onFrameCallback = options.onFrameCallback;
		this.callback.onBlinkCallback = options.onBlinkCallback;
		this.options.nativeScreenWidth = options.nativeScreenWidth;
		this.options.nativeScreenHeight = options.nativeScreenHeight;
		this.options.senzeScreenWidth = options.senzeScreenWidth;
		this.options.senzeScreenHeight = options.senzeScreenHeight;

		tcpClient = new exports.TcpClient(this.options.host, this.options.port);
		tcpClient.addResponseListener(this._onAPIResponse);

		tcpClient.connect(function(e){
			console.log('EyeTribe Connected');
			this.trackerAPIStatus = TRACKER_API_STATUS.STARTED;
			//this._startTracker(function(){
			//	this.trackerAPIStatus = TRACKER_API_STATUS.SENT_START_MESSAGE;
			//}.bind(this));
		}.bind(this));
	}

	// Internals
	TobiiEyeX.prototype._onAPIResponse = function(response){
		//console.log(response);
		//console.log(response);

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
			response = JSON.parse(response);
			
			if(response.category == CATEGORY.TRACKER){
				if(this.trackerAPIStatus == TRACKER_API_STATUS.SENT_START_MESSAGE){
					console.log('start message response');
					console.log(response);
					if(response.statuscode == 200){
						this.trackerAPIStatus = TRACKER_API_STATUS.STARTED;
						this._heartbeat();
					}
				}

				if( response.values != undefined ){
					if( response.values.frame != undefined ){
						this._processFrame(response.values.frame);
						this.callback.onFrameCallback(this.frame);
					}
				}	

			}else if(response.category === CATEGORY.CALIBRATION){

				console.log('calibration callback');
				console.log(response);
				
				if(this.callback.calibration != undefined){
					this.callback.calibration(response);
				}

			} else {
				this._processFrame(response);
				this.callback.onFrameCallback(this.frame);

			}
		}catch(e){
			console.log('response parse error');
			console.log(e);
			//console.log(response);
		}
	};

	TobiiEyeX.prototype._sendAPIMessage = function(category, request, values, callback){
	    var msg = {
	      "category": category,
	      "request": request,
	      "values": values
	    };
    	tcpClient.sendMessage(JSON.stringify(msg), callback);
  	};

  	TobiiEyeX.prototype._getTrackerInfo = function(category, request, values, callback){
	    this._sendAPIMessage('tracker', 'get', ['version', 'heartbeatinterval','trackerstate','framerate', 'iscalibrated'], function(e){
				console.log('tracker status check sent');
			});
  	};

  	TobiiEyeX.prototype._sendHeartbeat = function(callback){
    	var msg = {category: "heartbeat"};
    	tcpClient.sendMessage(JSON.stringify(msg), callback);
  	};

  	TobiiEyeX.prototype._startTracker = function(callback){
  		console.log('startTracker');
    	// TODO no need to start
    	//tcpClient.sendAPIMessage(CATEGORY.TRACKER, REQUEST.SET, {"push": true, "version": 1},callback);
  	};

  	// Heartbeat Methods

  	TobiiEyeX.prototype._heartbeat = function(callback){
    	this._sendHeartbeat();
		if(this.trackerAPIStatus == TRACKER_API_STATUS.STARTED){
			setTimeout(function(){
				this._heartbeat();
			}.bind(this), this.trackerInfo.heartbeatinterval);
		}
  	};

  	// Calibration Methods

  	TobiiEyeX.prototype.requestCalibration = function(){
  		// TODO use this calibrate
  		this._sendAPIMessage(CATEGORY.CALIBRATION, REQUEST.START, {});
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
		
		frame.gaze.x = frame.gaze.x * this.options.senzeScreenWidth / this.options.nativeScreenWidth;
		frame.gaze.y = frame.gaze.y * this.options.senzeScreenHeight / this.options.nativeScreenHeight;		

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