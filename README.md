# Tobii EyeX Chromne
Tobii EyeX TCP Javascript Client for Chrome App / Extensions

## Getting Started
1. Build / Get a prebuild binary of Tobii EyeX TCP Server from https://github.com/5un/eyex-tcp-server
2. Include eyex-chrome.js to your scripts
3. Initialize Tobii EyeX with
```javascript
	var eyeTracker = new TobiiEyeX({
	    onFrameCallback: function(frame){
	      console.log(frame);
	    },
    	onBlinkCallback: function(e){
      		//Do Nothing
    	}
  	});
```

The function passed into onFrameCallback will be called once per tracker frame passing the `frame` object containing frame information