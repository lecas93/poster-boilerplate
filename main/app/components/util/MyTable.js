let ventasCredito;

export default class MyTable extends React.Component {
    constructor(props) {
        super(props);
    }

    createTable() {
        let table = [];

        table.push(
            <thead>
                <tr>
                    <th># Ticket</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Action</th>
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
                children.push(<td><button className="btn btn-success" onClick={() => this.props.fnt(ventasCredito[i].num_ticket)}>Gestionar</button></td>);
                table.push(<tr>{children}</tr>);
            }
        }

        return table;
    }

    render() {
        ventasCredito = this.props.data;
        return (
            <table>
                {this.createTable()}
            </table>
        );
    }
}