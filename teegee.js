'use strict';

function copy_to_clipboard(text) {
    let buff = $("#tg-copybuff");
    buff.val(text).select();
    document.execCommand("copy");
}

Array.prototype.last = function() {
    return this[this.length - 1];
}

class State {
	constructor() {
		this.values = {}
		this.watches = {}
		this._updating = false
	}

	declare(key, value) {
		this.values[key] = value
		this.watches[key] = []
	}

	set(key, value) {
		if (this.values[key] === undefined)
			throw `Unknown name accessed in State: ${key}`
		this.values[key] = value
		// notify
		this.watches[key].forEach(cb => cb(this))
		if (!this._updating) {
			this._updating = true
			this.watches["_update"].forEach(cb => cb(this))				
			this._updating = false
		}
	}

	get(key) {
		return this.values[key]
	}

	watch(key, cb) {
		this.watches[key].push(cb)
	}
}

class UI {
	constructor(state) {
		this.state = state
		this.cursor = []
	}

	_get_cursor() {
		return this.cursor.last()
	}

	create_text(txt) {
		this._get_cursor().append(`<p class="tgw-text">${txt}</p>`)
	}

	create_pre(name, txt) {
		let elem = $('<div>').appendTo(this._get_cursor())
		elem.append(`<pre class="tgw-pre" id="${name}">${txt}</pre>`)
		// add copy to clipboard button
		elem.append(`<button class="tgw-copy" id="copy_${name}">Copy</button>`)
		let st = this.state
		$(`#copy_${name}`).button().click(function(evt){
			evt.preventDefault()
			copy_to_clipboard(st.get(name))
		})
		// change text on State change
		this.state.watch(name, (state) => $(`#${name}`).text(state.get(name)))
	}

	create_checkbox(name, label) {
		let elem = $('<div class="tgw-checkbox">').appendTo(this._get_cursor())
		elem.append(`<label for="${name}">${label}</label>`)
		elem.append(`<input type="checkbox" name="${name}" id="${name}">`)
		let st = this.state
		let cbx = $(`#${name}`)
		cbx.checkboxradio().change(function(){
			st.set(name, this.checked)
		})
		cbx.prop("checked", this.state.get(name)).change() // set initial state
	}

	create_options(name, label, opts) {
		let elem = $('<div class="tgw-options">').appendTo(this._get_cursor())
		elem.append(`<label for="${name}">${label}</label>`)
		elem.append(`<select name="${name}" id="${name}">`)
		let sel = $(`#${name}`)
		opts.forEach(o => {
			sel.append(`<option>${o.label}</option>`)
		})
		let st = this.state
		sel.selectmenu({ change: function(evt, ui) {
			let idx = ui.item.index
			let opt = opts[idx]
			st.set(name, opt.user)
		}})
	}

	create_box(label) {
		let elem = $('<fieldset class="tgw-group">').appendTo(this._get_cursor())
		this.cursor.push(elem)
		if (label) {
			$("<legend>").text(label).appendTo(elem)
		}
	}

	create_div() {
		let elem = $('<div class="tgw-row">').appendTo(this._get_cursor())
		this.cursor.push(elem)
	}
}

class Gen {
	constructor() {
		this.state = new State()
		this.state.declare("_update", "")
		this.ui = new UI(this.state)
	}

	add_boolean(name, label, value) {
		this.state.declare(name, value)
		this.ui.create_checkbox(name, label, value)
	}

	add_text_choice(name, label, opts) {
		this.state.declare(name, opts[0].user)
		this.ui.create_options(name, label, opts)
	}

	add_command_line(name, text) {
		this.state.declare(name, text)
		this.ui.create_pre(name, text)
	}

	begin_group_box(label) {
		this.ui.create_box(label)			
	}

	begin_group_row() {
		this.ui.create_div()			
	}

	end_group() {
		this.ui.cursor.pop()
	}

	on_update(cb) {
		this.state.watch("_update", cb)
		cb(this.state)
	}
}

class Option {
	constructor(label, user) {
		this.label = label
		this.user = user
	}
}

var _tg_class_conv = {
	tgpanel: function(gen, elem) {
	},

	tggroup: function(gen, elem) {
		gen.begin_group_box(elem.attr('label'))
		return _ => gen.end_group()
	},

	tgrow: function(gen, elem) {
		gen.begin_group_row()
		return _ => gen.end_group()
	},

	tgchoice: function(gen, elem) {
		let opts = []
		elem.children('option').each(function (idx, ch) {
			ch = $(ch)
			opts.push(new Option(ch.text(), ch.attr('value') || ch.text()))
		})
		gen.add_text_choice(elem.attr('name'), elem.attr('label') || '', opts)
	},

	tgbool: function(gen, elem) {
		gen.add_boolean(elem.attr('name'), elem.text(), elem.attr('value') == 'true')
	},

	tgcmdline: function(gen, elem) {
		gen.add_command_line(elem.attr('name'), elem.text())
	}
}

// Recursively convery options into Generator, State, & GUI.
function _tg_process(gen, elem) {
	let cls = elem.attr('class')
	let closer
	if (cls && cls.startsWith('tg')) {
		let pr = _tg_class_conv[cls]
		if (!pr)
			throw `Unrecognised tg class: ${cls}`;
		closer = pr(gen, elem)
	}

	let ch = elem.children('div').each(function (idx, ch){
		_tg_process(gen, $(ch))			
	})

	if (closer)
		closer()
}

//---------------------------------------------------------
// Public

function tg_init(desc) {
	// create elements for clipboard buffer and form
	desc.parent().append('<input style="visibility: hidden" id="tg-copybuff"></input>')
	let root = $('<form action="#"" class="tgw-panel">').appendTo(desc.parent())		
	let gen = new Gen()
	gen.ui.cursor.push(root)
	_tg_process(gen, desc)
	return gen
}