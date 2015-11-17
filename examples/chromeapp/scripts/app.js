window.addEventListener('load', function(){

	var eyeTracker = new TobiiEyeX({
    	browserScreenWidth: window.innerWidth,
    	browserScreenHeight: window.innerHeight,
	    onFrameCallback: function(frame){
	      //console.log(frame);
        $('#results').html(JSON.stringify(frame));

        $('#gaze').css('left', frame.smoothXY.x + 'px');
        $('#gaze').css('top', frame.smoothXY.y + 'px');
      },
    	onBlinkCallback: function(e){
      		//Do Nothing
    	}
  	});

  console.log(eyeTracker);

  $('#btn-tracker-info').click(function(){
    eyeTracker.getTrackerInfo(function(info){
      console.log('response');
      console.log(info);
    });
  });

  $('#btn-calibrate').click(function(){
    eyeTracker.requestCalibration();
  });
	
});