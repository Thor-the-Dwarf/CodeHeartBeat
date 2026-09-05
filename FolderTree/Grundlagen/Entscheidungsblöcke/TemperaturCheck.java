public class TemperaturCheck {
    public static void main(String[] args) {
        int temperatur = 18;

        if (temperatur >= 25) {
            System.out.println("Es ist warm.");
        } else if (temperatur >= 15) {
            System.out.println("Es ist mild.");
        } else {
            System.out.println("Es ist kalt.");
        }
    }
}
