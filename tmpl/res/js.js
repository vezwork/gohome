var dropzone;
var target;
var uploadInput;

function startup() {
    context_element = document.getElementById("context-menu");
    dropzone  = document.getElementById('dropzone');
    uploadInput = document.getElementById("uploadfile");
    
    //context menu stuff
    document.addEventListener('contextmenu', function(e) {
        if (e.target.className.split(" ")[0] == "file") {
            target = e.target;
            filename = target.parentNode.textContent+target.getAttribute("filetype");
            console.log("drop " + filename);
            context_element.innerHTML = "<a href='/upl/"+ filename + "' download>⇣ Download</a>" +
                "<a>📂 Preview / Edit</a>" +
                "<div></div>" +
                "<a onclick=deleteFile('"+filename+"');>✖ Delete</a>" +
                "<a>✎ Rename</a>"+
                "<div></div>" +
                "<a>� Info</a>" +
                "<a>🔗 Get Link</a>";
            var view_bottom = window.innerHeight + window.pageYOffset; //bottom of viewport
            if (view_bottom - e.pageY > 300) {
                context_element.style.top = e.pageY+"px";
                context_element.style.left = e.pageX+"px";
            } else {
                context_element.style.top = (e.pageY - 300)+"px";
                context_element.style.left = e.pageX+"px";
            }
            context_element.style.display = "block";
            
        } else if (e.target.id == "dropzone") {
             context_element.innerHTML = "\
                <a onclick='selectFile();'>⇡ Upload</a>\
                <a>✚ New Text File</a>";
            var view_bottom = window.innerHeight + window.pageYOffset;
            if (view_bottom - e.pageY < 100) {
                context_element.style.top = (e.pageY-100)+"px";
                context_element.style.left = e.pageX+"px";
            } else {
                context_element.style.top = e.pageY+"px";
                context_element.style.left = e.pageX+"px";
            }
            context_element.style.display = "block";
        }else {
            context_element.style.display = "none";
        }
        e.preventDefault();
    }, false);
    
    document.addEventListener('click', function(e) {
        context_element.style.display = "none";
    });
    
    //file upload stuff
	dropzone.addEventListener('dragover', cancel, false);
	dropzone.addEventListener('dragenter', cancel, false);
	dropzone.addEventListener('drop', function(e) { 
		e = e || window.event;
		if (e.preventDefault) { e.preventDefault(); }

		var fs = e.dataTransfer.files;
		uploadFiles(fs)
		return false;
	});
	uploadInput.addEventListener('change', function(e) {
		uploadFiles(uploadInput.files);
		uploadInput.value = null;
	});
}

Element.prototype.remove = function() {
    this.parentElement.removeChild(this);
}
NodeList.prototype.remove = HTMLCollection.prototype.remove = function() {
    for(var i = this.length - 1; i >= 0; i--) {
        if(this[i] && this[i].parentElement) {
            this[i].parentElement.removeChild(this[i]);
        }
    }
}

function deleteFileElement(eldel) {
    eldel.parentNode.style.webkitAnimationDirection = "reverse";
    eldel.parentNode.style.webkitAnimationName = "expand";
    
    fun = function (elem) {
        return function(e) {
            elem.parentNode.remove();
            elem.remove();
        };
    }(eldel);
    eldel.parentNode.addEventListener("animationend", fun);
}

function addFileElement(name, ext) {
    dropzone.insertAdjacentHTML('afterbegin', "<a href='/upl/"+ name + "." +ext +"'><div class='file "+ ext +"' filetype='."+ext+"'></div>"+name+"</a>");
    dropzone.firstChild.style.webkitAnimationName = "expand";

    fun = function (elem) {
        return function(e) {
            elem.style.webkitAnimationName = "";
        };
    }(dropzone.firstChild);
    dropzone.firstChild.addEventListener("animationend", fun);
}

function selectFile() {
    uploadInput.click();
}

//file upload stuff

function cancel(e) {
	if (e.preventDefault) { 
		e.preventDefault(); 
	}
	return false;
}

function uploadFiles(fs) {
	if (fs.length == 0) {
		console.log('no file to upload!');
		return;
	}
	var fd = new FormData();
	var xhr = new XMLHttpRequest();
	    xhr.open('POST', '/', true);
	
    var fun = function(files) {
        return function() {
                if (xhr.readyState == 4) {
                    if (xhr.status == 0) {
                        console.log('A state error occurred!');
                    } else if (xhr.status == 200) {
                        console.log('file uploaded!');
                        for (var i = 0; i < files.length; i++) {
                            var name = fs[i].name.substr(0, fs[i].name.lastIndexOf('.'));
                            var ext = fs[i].name.substr(fs[i].name.lastIndexOf('.') + 1);
                            addFileElement(name, ext);
                        }
                    }
                }
            };
    }(fs);
	xhr.onreadystatechange = fun;
	    
    for (var i = 0; i < fs.length; i++) {
        fd.append('uploadfile', fs[i], fs[i].name);
    }

	xhr.send(fd);
}

function deleteFile(name) {
	var xhr = new XMLHttpRequest();
	    xhr.open('DELETE', "/upl/" + name, true);
    //apply to target
    fun = function(eldel) {
        return function() {
                if (xhr.readyState == 4) {
                    if (xhr.status == 0) {
                        console.log('A state error occurred!');
                    } else if (xhr.status == 200) {
                        console.log('file uploaded!');
                        deleteFileElement(eldel);
                    }
                }
            };
    }(target);
    
    xhr.onreadystatechange = fun;
    xhr.send();
}