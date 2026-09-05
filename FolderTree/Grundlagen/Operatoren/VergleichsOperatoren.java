public class VergleichsOperatoren {
    public static void main(String[] args) {
        int alter = 20;
        int mindestalter = 18;

        boolean gleich = alter == mindestalter;
        boolean ungleich = alter != mindestalter;
        boolean volljaehrig = alter >= mindestalter;

        System.out.println("Gleich: " + gleich);
        System.out.println("Ungleich: " + ungleich);
        System.out.println("Volljährig: " + volljaehrig);
    }
}
