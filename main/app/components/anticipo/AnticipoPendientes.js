import './style.css';
import '../venta-credito/lds-roller.css';
import '../venta-credito/sk-cube.css';
import ErrorAviso from '../aviso/ErrorAviso';
import Swal from 'sweetalert2';
import PagosManager from '../util/PagosManager';

let _PagosManager = null;

let clientId;
let ventasCredito;

let tableAnticipos = null;

function refresh() {
    this.setState();
}

function getClient(id) {
    Poster.clients.get(id).then((client) => {
        if (!client) {
            return;
        }

        $('#clientAnticipo').text(client.lastname + ' ' + client.firstname + ' ' + client.patronymic);
        localStorage.setItem('client', $('#clientAnticipo').text());
    });
}

function showPagosManager(num_ticket, _monto) {
    $('#divSelectAnticipos').hide();
    $('#divTableAnticipos').hide();
    _PagosManager = <PagosManager tipo="anticipo" numTicket={num_ticket} monto={_monto} />;
    $('#divPagosManagerAnticipos').show();
    refresh();
}

function getCreditosCliente() {
    let status = $('select[id=selectAnticipos] option:selected').val();
    if (status === '-1') return;
    $('#anticiposLoader').show();
    $('#divTableAnticipos').hide();
    Poster.makeRequest('url/anticipos_cliente.php', {
        headers: [],
        method: 'POST',
        data: {
            client_id: clientId,
            estado: status
        },
        timeout: 10000
    }, (answer) => {
        if (Number(answer.code) === 200) {
            ventasCredito = JSON.parse(answer.result);
            console.log(ventasCredito);
            tableAnticipos = createTable();
        } else {
            showNotification('error', 'Error', 'Ha ocurrido un error. Por favor, intente de nuevo.');
        }
        refresh();
        $('#anticiposLoader').hide();
        $('#divTableAnticipos').show();
    });
}

function createTable() {
    let table = [];

    table.push(
        <thead>
            <tr>
                <th># Ticket</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>*</th>
            </tr>
        </thead>
    );

    let num_orders = ventasCredito.length;
    if (num_orders !== 0) {
        for (let i = 0; i < num_orders; i++) {
            let children = [];
            children.push(<td>{ventasCredito[i].num_ticket}</td>);
            children.push(<td>${ventasCredito[i].monto}</td>);
            children.push(<td>{(ventasCredito[i].pagado === '0' ? 'No pagado' : 'Pagado')}</td>);
            children.push(<td><button className="btn btn-success" onClick={() => showPagosManager(ventasCredito[i].num_ticket, ventasCredito[i].monto)}>Gestionar</button></td>);
            table.push(<tr>{children}</tr>);
        }
    }

    return table;
}

function showNotification(type, title, text = '', needclose = false) {
    Swal.fire({
        type: type,
        title: title,
        text: text,
        confirmButtonText: 'Ok',
        allowOutsideClick: false
    }).then((result) => {
        if (result.value) {
            if (needclose === true) Poster.interface.closePopup();
        }
    });
}

export default class AnticipoPendientes extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentTable: null
        };

        refresh = refresh.bind(this);
        getCreditosCliente = getCreditosCliente.bind(this);
    }

    render() {
        clientId = this.props.clientId;

        if (clientId === 0) return (<ErrorAviso emoji='⛔' msg='¡No se ha vinculado ningún cliente!' />);
        localStorage.setItem('alreadyLoaded', 'false');
        getClient(clientId);

        return (
            <div>
                <div className="row">
                    <div className="col-sm-3">
                        <img src="url logo" alt="imagen" className="img-thumbnail img-responsive center-block" />
                    </div>
                    <div className="col-sm-9">
                        <h2>Ventas por anticipo</h2>
                        <h3>Cliente: <p id="clientAnticipo"></p></h3>
                    </div>
                </div>
                <br />
                <div className="row" id="divSelectAnticipos">
                    <div className="col-sm-12">
                        Mostrar:
                        <select className="form-control" onChange={getCreditosCliente} id="selectAnticipos">
                            <option value="-1">Seleccione una opción</option>
                            <option value="0">No pagados</option>
                            <option value="1">Pagados</option>
                            <option value="2">Todos</option>
                        </select>
                    </div>
                </div>
                <div id="anticiposLoader" hidden>
                    <div className="sk-cube-grid">
                        <div className="sk-cube sk-cube1"></div>
                        <div className="sk-cube sk-cube2"></div>
                        <div className="sk-cube sk-cube3"></div>
                        <div className="sk-cube sk-cube4"></div>
                        <div className="sk-cube sk-cube5"></div>
                        <div className="sk-cube sk-cube6"></div>
                        <div className="sk-cube sk-cube7"></div>
                        <div className="sk-cube sk-cube8"></div>
                        <div className="sk-cube sk-cube9"></div>
                    </div>
                </div>
                <br />
                <div className="row scrollable-creditos">
                    <div className="col-sm-12">
                        <div id="divTableAnticipos" hidden>
                            <table id="tableAnticipos">
                                {tableAnticipos}
                            </table>
                        </div>
                        <div id="divPagosManagerAnticipos" hidden>
                            {_PagosManager}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}