import './style.css';

class ErrorAviso extends React.Component {

    constructor(props) {
        super(props);
        Poster.on('afterPopupClosed', () => {
            location.reload();
        });
    }

    render() {
        return (
            <div className="aviso">
                <h1>{this.props.emoji}</h1>
                <br />
                <p>{this.props.msg}</p>
                <br />
                <button className="btn btn-lg btn-default" onClick={Poster.interface.closePopup}>
                    Cerrar
                </button>
            </div>
        );
    }
}

export default ErrorAviso;