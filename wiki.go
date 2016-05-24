package main

import(
	"io/ioutil"
	"io"
	"net/http"
	"html/template"
	"regexp"
	"fmt"
	"os"
	"time"
	"strings"
)

type Page struct {
	Title string
	Body  []byte
}

type UpFile struct {
	Name string
	Type string
	Size int64
	Time time.Time
}
var files = make(map[string]UpFile)

var templates = template.Must(template.ParseFiles("tmpl/edit.html", "tmpl/view.html", "tmpl/upload.html"))
var validPath = regexp.MustCompile("^/(edit|view)/([a-zA-Z0-9]+)$")

func (f UpFile) Path() string {
	return "upl/"+f.Name+f.Type
}

func (f UpFile) TypeNoDot() string {
	return f.Type[1:]
}

func Ext(path string) string {
	for i := len(path) - 1; i >= 0 && !os.IsPathSeparator(path[i]); i-- {
		if path[i] == '.' {
			return path[i:]
		}
	}
	return ""
}

func (p *Page) save() error {
	filename := p.Title + ".txt"
	return ioutil.WriteFile(filename, p.Body, 0600)
}

func loadPage(title string) (*Page, error) {
	filename := title + ".txt"
	body, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	return &Page{Title: title, Body: body}, nil
}

func renderTemplate(w http.ResponseWriter, tmpl string, p *Page) {
	err := templates.ExecuteTemplate(w, tmpl+".html" ,p)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func makeHandler(fn func (http.ResponseWriter, *http.Request, string)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		m := validPath.FindStringSubmatch(r.URL.Path)
		if m == nil {
			http.NotFound(w,r)
			return
		}
		fn(w, r, m[2])
	}
}

func editHandler(w http.ResponseWriter, r *http.Request, title string) {
	fmt.Println("edit")
	if r.Method == "GET" {
		p, err := loadPage(title)
		if err != nil {
			p = &Page{Title: title}
		}
		renderTemplate(w, "edit", p)
	} else if r.Method == "POST" {
		fmt.Println("save")
		body := r.FormValue("body")
		p := &Page{Title: title, Body: []byte(body)}
		err := p.save()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		http.Redirect(w, r, "/view/" + title, http.StatusFound)
	}
}

func viewHandler(w http.ResponseWriter, r *http.Request, title string) {
	fmt.Println("view")
	p, err := loadPage(title)
	if err != nil {
		http.Redirect(w, r, "/edit/" + title, http.StatusFound)
		return
	}
	renderTemplate(w, "view", p)
}

func RegisterFile(f os.FileInfo) error {
	
	suffix := Ext(f.Name())
	name := strings.TrimSuffix(f.Name(), suffix)
	size := f.Size()
	
	files[f.Name()] = UpFile{Name: name, Type: suffix, Size: size, Time: time.Now()}
	
	fmt.Println(files[f.Name()].Path())
	return nil
}

func DirectoryToUpFiles() {
	files, _ := ioutil.ReadDir("./upl/")
	for _, fi := range files {
		RegisterFile(fi)
	}
}

func defaultHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		fmt.Println("default GET")
		templates.ExecuteTemplate(w, "upload.html" ,files)
		//deal with err from this
	} else if r.Method == "POST" {
		fmt.Println("default POST")
		r.ParseMultipartForm(32 << 20)
		file, handler, err := r.FormFile("uploadfile")
		if err != nil {
			fmt.Println(err)
			return
		}
		defer file.Close()
		f, err := os.Create("./upl/"+handler.Filename)
		if err != nil {
		    fmt.Println(err)
		    return
		}
		defer f.Close()
		io.Copy(f, file)
		fi, _ := f.Stat()
		RegisterFile(fi)
		
	}
}

func staticHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method =="GET" {
		http.ServeFile(w, r, r.URL.Path[1:])
	} else if r.Method == "DELETE" {
		fmt.Println("remove: " + r.URL.Path[1:])
		err := os.Remove(r.URL.Path[1:])
		if (err != nil) {
			fmt.Println(err)
		}
		
		delete(files, r.URL.Path[len("/upl/"):])
		//handle errors?
	}
}

func main() {
	DirectoryToUpFiles()
	http.HandleFunc("/", defaultHandler)
	http.HandleFunc("/tmpl/res/", staticHandler)
	http.HandleFunc("/upl/", staticHandler)
	http.HandleFunc("/view/", makeHandler(viewHandler))
	http.HandleFunc("/edit/", makeHandler(editHandler))
	http.ListenAndServe(":8080", nil)
}
