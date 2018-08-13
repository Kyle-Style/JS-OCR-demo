(function () {
    var video = document.querySelector('video');

    var pictureWidth = 640;
    var pictureHeight = 360;

    var fxCanvas = null;
    var texture = null;

    function checkRequirements() {
        var deferred = new $.Deferred();

        //Check if getUserMedia is available
        if (!Modernizr.getusermedia) {
            deferred.reject('浏览器不支持 getUserMedia (根据 Modernizr).');
        }

        //Check if WebGL is available
        if (Modernizr.webgl) {
            try {
                //setup glfx.js
                fxCanvas = fx.canvas();
            } catch (e) {
                deferred.reject('抱歉, glfx.js 初始化失败. WebGL 问题?');
            }
        } else {
            deferred.reject('浏览器不支持 WebGL (根据 Modernizr).');
        }

        deferred.resolve();

        return deferred.promise();
    }
	
	function filechange(event){
		var files = event.target.files;
		var file;
		if (files && files.length > 0) {
			// 获取目前上传的文件
			file = files[0];// 文件大小校验的动作
			if(file.size > 1024 * 1024 * 2) {
				alert('图片大小不能超过 2MB!');
				return false;
			}
			// 获取 window 的 URL 工具
			var URL = window.URL || window.webkitURL;
			// 通过 file 生成目标 url
			var imgURL = URL.createObjectURL(file);
            var canvas = document.querySelector('#step1 canvas');
			var cxt = canvas.getContext("2d");
			var img = new Image();
			img.src = imgURL;
			cxt.drawImage(img, 0, 0);
			//用attr将img的src属性改成获得的url
			$("#img-change").attr("src",imgURL);
			// 使用下面这句可以在内存中释放对此 url 的伺服，跑了之后那个 URL 就无效了
			// URL.revokeObjectURL(imgURL);
			step2();
			changeStep(2);
		}
	}
	
	$("#img-change").click(function () {
		$("#file").click();
	});
	
	$("#img-choose").click(function () {
		$("#file").click();
	});

    function step1() {
    }

    function step2() {
        var canvas = document.querySelector('#step1 canvas');
        var img = document.querySelector('#step2 img');
        //setup canvas
        canvas.width = pictureWidth;
        canvas.height = pictureHeight;

        var ctx = canvas.getContext('2d');

        //draw picture from video on canvas
        ctx.drawImage(video, 0, 0);

        //modify the picture using glfx.js filters
        texture = fxCanvas.texture(canvas);
        fxCanvas.draw(texture)
            .hueSaturation(-1, -1)//grayscale
            .unsharpMask(20, 2)
            .brightnessContrast(0.2, 0.9)
            .update();

        window.texture = texture;
        window.fxCanvas = fxCanvas;

        $(img)
        //setup the crop utility
            .one('load', function () {
                if (!$(img).data().Jcrop) {
                    $(img).Jcrop({
                        onSelect: function () {
                            //Enable the 'done' button
                            $('#adjust').removeAttr('disabled');
                        }
                    });
                } else {
                    //update crop tool (it creates copies of <img> that we have to update manually)
                    $('.jcrop-holder img').attr('src', fxCanvas.toDataURL());
                }
            })
            //show output from glfx.js
            .attr('src', fxCanvas.toDataURL());
    }

    function step3() {
        var canvas = document.querySelector('#step3 canvas');
        var step2Image = document.querySelector('#step2 img');
        var cropData = $(step2Image).data().Jcrop.tellSelect();

        var scale = step2Image.width / $(step2Image).width();

        //draw cropped image on the canvas
        canvas.width = cropData.w * scale;
        canvas.height = cropData.h * scale;

        var ctx = canvas.getContext('2d');
        ctx.drawImage(
            step2Image,
            cropData.x * scale,
            cropData.y * scale,
            cropData.w * scale,
            cropData.h * scale,
            0,
            0,
            cropData.w * scale,
            cropData.h * scale);

        //use ocrad.js to extract text from the canvas
        var resultText = OCRAD(ctx);
        resultText = resultText.trim();

        //show the result
        $('blockquote p').html('&bdquo;' + resultText + '&ldquo;');
        $('blockquote footer').text('(' + resultText.length + ' characters)')
    }

    /*********************************
     * UI Stuff
     *********************************/

    //start step1 immediately
    step1();
    $('.help').popover();

    function changeStep(step) {
        if (step === 1) {
            video.play();
        } else {
            video.pause();
        }

        $('body').attr('class', 'step' + step);
        $('.nav li.active').removeClass('active');
        $('.nav li:eq(' + (step - 1) + ')').removeClass('disabled').addClass('active');
    }

    function showError(text) {
        $('.alert').show().find('span').text(text);
    }

    //handle brightness/contrast change
    $('#brightness, #contrast').on('change', function () {
        var brightness = $('#brightness').val() / 100;
        var contrast = $('#contrast').val() / 100;
        var img = document.querySelector('#step2 img');

        fxCanvas.draw(texture)
            .hueSaturation(-1, -1)
            .unsharpMask(20, 2)
            .brightnessContrast(brightness, contrast)
            .update();

        img.src = fxCanvas.toDataURL();

        //update crop tool (it creates copies of <img> that we have to update manually)
        $('.jcrop-holder img').attr('src', fxCanvas.toDataURL());
    });

    $('#img-choose').click(function () {
    });

    $('#adjust').click(function () {
        step3();
        changeStep(3);
    });

    $('#go-back').click(function () {
        changeStep(2);
    });

    $('#start-over').click(function () {
        changeStep(1);
    });

    $('.nav').on('click', 'a', function () {
        if (!$(this).parent().is('.disabled')) {
            var step = $(this).data('step');
            changeStep(step);
        }

        return false;
    });
})();