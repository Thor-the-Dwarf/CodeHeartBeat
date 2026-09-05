public class Zuweisungsoperatoren {
    public static void main(String[] args) {
        int punkte = 10;

        punkte += 5;
        System.out.println("Nach += 5: " + punkte);

        punkte -= 3;
        System.out.println("Nach -= 3: " + punkte);

        punkte *= 2;
        System.out.println("Nach *= 2: " + punkte);
    }
}
