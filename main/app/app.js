import './styles.css';

import BtnFunctions from './components/btnFunctions/BtnFunctions';
import BtnPayment from './components/btnPayment/BtnPayment';
import BtnOrder from './components/btnOrder/BtnOrder';

import ErrorAviso from './components/aviso/ErrorAviso';
import ReportMaker from './components/reporte/ReportMaker';
import PaymentInterface from './components/payment-interface/PaymentInterface';

const btnFunctionsTitle = 'Funciones Extras';
const btnPaymentTitle = 'Facturar';
const btnOrderTitle = 'Más Opciones';
const btnReceiptTitle = 'Generar Reporte';

let client_id = 0;
let currentData;

let trelloKey = 'trello key';
let trelloToken = 'trello token';

let wrap = null, wrap_selection = null;

function Vista(props) {
	const place = props.place;
	const data = props.data;
	const clientID = client_id;

	if (place == 'order') {
		return <BtnOrder data={data} />;
	} else if (place == 'functions') {
		return <BtnFunctions clientId={clientID} />;
	} else if (place == 'receiptsArchive') {
		return <ReportMaker />;
	} else if (place == 'payment') {
		return <BtnPayment data={data} />;
	} else if (place === 'paymentInterface') {
		return <PaymentInterface data={data} />;
	}
	return <ErrorAviso emoji='⛔' msg='¡No se ha vinculado ningún cliente!' />;
}

function setJQuery() {
	(function (d, s, id) {
		var js, fjs = d.getElementsByTagName(s)[0];
		if (d.getElementById(id)) { return; }
		js = d.createElement(s); js.id = id;
		js.onload = function () {
			setTrello();
		};
		js.src = "https://code.jquery.com/jquery-3.4.0.min.js";
		fjs.parentNode.insertBefore(js, fjs);
	}(document, 'script', 'JQuery'));
}

function setTrello() {
	(function (d, s, id) {
		var js, fjs = d.getElementsByTagName(s)[0];
		if (d.getElementById(id)) { return; }
		js = d.createElement(s); js.id = id;
		js.onload = function () {
			Trello.setToken(trelloToken);
			console.log("Success", "Trello Cargo");
			//setDependency("css","https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css");
			//setDependency("js", "https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js");
		};
		js.src = "https://trello.com/1/client.js?key=" + trelloKey;
		fjs.parentNode.insertBefore(js, fjs);
	}(document, 'script', 'Trello'));
}

function setDependency(filetype, filename) {
	if (filetype == "js") { //if filename is a external JavaScript file
		var fileref = document.createElement('script')
		fileref.setAttribute("type", "text/javascript")
		fileref.setAttribute("src", filename)
	}
	else if (filetype == "css") { //if filename is an external CSS file
		var fileref = document.createElement("link")
		fileref.setAttribute("rel", "stylesheet")
		fileref.setAttribute("type", "text/css")
		fileref.setAttribute("href", filename)
	}
	if (typeof fileref != "undefined")
		document.getElementsByTagName("head")[0].appendChild(fileref)
}

function showBtnFunctions(clientId) {
	client_id = clientId;
	this.setState({ place: 'functions' });
	Poster.interface.popup({ width: 900, height: 720, title: btnFunctionsTitle });
}

function showReportManager(data) {
	this.setState({ place: data.place });
	Poster.interface.popup({ width: 400, height: 540, title: btnReceiptTitle });
}

function showBtnPayment(data) {
	client_id = data.order.clientId;
	this.setState({ place: data.place, data: data });
	Poster.interface.popup({ width: 800, height: 525, title: btnPaymentTitle });
}

function showPaymentInterface(data) {
	this.setState({ place: 'paymentInterface', data: data });
	Poster.interface.popup({ width: window.outerWidth, height: window.outerHeight, title: 'Empresa Orden #' + data.order.orderName });
}

function showError() {
	this.setState({ place: 'error' });
	Poster.interface.popup({
		width: 600,
		height: 350,
		title: 'Aviso'
	});
}

function resetLocalStorage() {
	localStorage.setItem('active', 'false');
	localStorage.setItem('clientRFC', '');
	localStorage.setItem('clientName', '');
	localStorage.setItem('clientPhone', '');
	localStorage.setItem('clientAddress', '');
	localStorage.setItem('clientEmail', '');
	localStorage.setItem('clientTarjeta', '');
	localStorage.setItem('clientCFDI', '');
	localStorage.setItem('clientObservations', '');
}

export default class App extends React.Component {

	constructor(props) {

		super(props);

		localStorage.setItem('version', 'versión 2.24.25 dev');
		localStorage.setItem('credit_group_id', '2');
		localStorage.setItem('sucursal_1', 'Terranorte');
		localStorage.setItem('sucursal_2', 'Caucel');
		localStorage.setItem('sucursal_5', 'Matriz');

		resetLocalStorage();
		setJQuery();

		showBtnFunctions = showBtnFunctions.bind(this);
		showReportManager = showReportManager.bind(this);
		showBtnPayment = showBtnPayment.bind(this);
		showError = showError.bind(this);
		showPaymentInterface = showPaymentInterface.bind(this);

		this.state = {
			emoji: '',
			message: '',
			place: '',
			data: null
		};

		// Mostrar botones para funcionalidades extras en los placeholders
		Poster.interface.showApplicationIconAt({
			functions: btnFunctionsTitle,
			order: btnOrderTitle,
			payment: btnPaymentTitle,
			receiptsArchive: btnReceiptTitle
		});

		// eventos de los placeholders
		Poster.on('applicationIconClicked', (data) => {
			switch (data.place) {
				case 'order':
					if (data.order.clientId != 0) {
						currentData = data;
						this.setState({ place: data.place, data: data });
						Poster.interface.popup({ width: 1200, height: 800, title: btnOrderTitle });
					} else {
						showError();
					}
					break;
				case 'functions':
					Poster.orders.getActive()
						.then(function (order) {
							showBtnFunctions(order.order.clientId);
						});
					break;
				case 'payment':
					showBtnPayment(data);
					break;
				case 'receiptsArchive':
					showReportManager(data);
					break;
			}
		});

		Poster.on('orderClientChange', (data) => {
			client_id = data.clientId;
			resetLocalStorage();
		})

		// checamos que se haya vinculado un cliente a la orden
		Poster.on('beforeOrderClose', (data, next) => {
			if (data.order.clientId != 0) {
				//verificamos si el poster tiene conexion a internet
				Poster.makeApiRequest('settings.getAllSettings', {
					method: 'get'
				}, (result) => {
					if (result) {
						showPaymentInterface(data);
					} else {
						next();
					}
				});
			} else {
				showError();
			}
		});

		Poster.on('userLogin', (res) => {
			localStorage.setItem('asesor_activo', res.user.name);
			Poster.makeApiRequest('access.getSpots', {
				method: 'get'
			}, (stations) => {
				let length = stations.length;
				for (let i = 0; i < length; i++) {
					if (Number(stations[i].spot_id) === Poster.settings.spotId) {
						localStorage.setItem('sucursal_local', stations[i].spot_name);
						break;
					}
				}
			});

			Poster.makeApiRequest('access.getEmployees', {
				method: 'get'
			}, (employees) => {
				for (let i = 0, len = employees.length; i < len; i++) {
					if (employees[i].user_id === res.user.id) {
						let role = employees[i].role_id;
						if (role === 5 || role === 6 || role === 3) { // 5 - Manager, 6 - Encargado, 3 - Owner
							localStorage.setItem('auth', '0');
						} else {
							localStorage.setItem('auth', '-1');
						}
						break;
					}
				}
			});
		});
	}

	render() {
		const { place, data } = this.state;
		return (
			<div>
				<Vista place={place} data={data} />
			</div>
		);
	}
}