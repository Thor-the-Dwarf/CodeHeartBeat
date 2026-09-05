public class RecordBeispiel {
    record Punkt(int x, int y) {}

    public static void main(String[] args) {
        Punkt punkt = new Punkt(4, 7);
        System.out.println("Punkt: " + punkt.x() + ", " + punkt.y());
    }
}
