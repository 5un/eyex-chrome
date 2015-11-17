window.addEventListener('load', function(){

	var eyeTracker = new TobiiEyeX({
    	nativeScreenWidth: 1920,
    	nativeScreenHeight: 1080,
    	senzeScreenWidth: window.innerWidth,
    	senzeScreenHeight: window.innerHeight,
	    onFrameCallback: function(frame){
	      console.log(frame);
	    },
    	onBlinkCallback: function(e){
      		//Do Nothing
    	}
  	});
	
});